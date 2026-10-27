import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { transform } from "esbuild";
import { documentationFiles, markdownLinks, typescriptBlocks } from "./documentation";
import { liveConfig } from "./integration-policy";

const root = process.cwd();
const require = createRequire(import.meta.url);
const fixtures = path.join(root, "scripts/fixtures/consumers");
const npmCli = process.env.npm_execpath;
if (process.argv.includes("--live"))
  assert.ok(liveConfig(process.env), "Explicit live configuration required");
assert.ok(npmCli && path.isAbsolute(npmCli), "Run through npm run test:package");
const temp = await mkdtemp(path.join(os.tmpdir(), "circleso-package-"));
type Packed = { filename: string; integrity: string; files: { path: string }[] };
type Manifest = {
  name: string;
  version: string;
  type: string;
  engines: { node: string };
  dependencies: Record<string, string>;
  exports: Record<string, Record<"import" | "require", { types: string; default: string }>>;
};

function run(
  file: string,
  args: string[],
  cwd: string,
  environment: NodeJS.ProcessEnv = {},
): string {
  const result = spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 240_000,
    env: { ...process.env, NODE_PATH: "", ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  });
  assert.ifError(result.error);
  const diagnostics = args.includes("--traceResolution")
    ? result.stdout
        .split("\n")
        .filter((line) => line.includes("error TS"))
        .join("\n")
    : result.stdout;
  assert.equal(result.status, 0, `${diagnostics}\n${result.stderr}`);
  return result.stdout;
}

async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}

try {
  const externalTarball = process.env.CIRCLE_PACKAGE_TARBALL;
  const [packed] = JSON.parse(
    run(
      process.execPath,
      [npmCli, "pack", "--json", "--ignore-scripts", "--pack-destination", temp],
      root,
    ),
  ) as Packed[];
  assert.ok(packed);
  const tarball = externalTarball
    ? path.resolve(externalTarball)
    : path.join(temp, packed.filename);
  const bytes = await readFile(tarball);
  // An externally retained release/registry artifact must match the clean source build exactly.
  // All consumers below install these supplied bytes, never the locally repacked comparison.
  assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, packed.integrity);
  const names = packed.files.map(({ path: file }) => file);
  for (const file of names) {
    assert.ok(
      [
        "package.json",
        "README.md",
        "CHANGELOG.md",
        "LICENSE",
        "CONTRIBUTING.md",
        "SUPPORT.md",
        "SECURITY.md",
      ].includes(file) ||
        /^docs\/[\w-]+\.md$/.test(file) ||
        /^dist\/[\w-]+\.(?:js|cjs|d\.ts|d\.cts)(?:\.map)?$/.test(file),
      `Unexpected package file: ${file}`,
    );
  }
  const consumer = path.join(temp, "consumer");
  await mkdir(consumer);
  await writeFile(
    path.join(consumer, "package.json"),
    JSON.stringify({
      name: "circleso-package-consumer",
      version: "1.0.0",
      private: true,
      type: "module",
    }),
  );
  // npm ci can cache tarballs without registry metadata. Seed a fresh, isolated cache
  // explicitly so offline consumer resolution never relies on a developer's cache history.
  const cache = path.join(temp, "npm-cache");
  run(
    process.execPath,
    [
      npmCli,
      "cache",
      "add",
      "openapi-fetch@0.15.0",
      "openapi-typescript-helpers@0.0.15",
      "--cache",
      cache,
      "--ignore-scripts",
    ],
    consumer,
  );
  console.log("Package cache: two pinned public runtime packages seeded in a fresh isolated cache");
  run(
    process.execPath,
    [
      npmCli,
      "install",
      "--offline",
      "--cache",
      cache,
      "--ignore-scripts",
      "--omit=dev",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    consumer,
  );
  const installed = path.join(consumer, "node_modules/circleso");
  const manifest = await json<Manifest>(path.join(installed, "package.json"));
  assert.equal(manifest.name, "circleso");
  assert.equal(manifest.type, "module");
  assert.equal(manifest.engines.node, "^22.0.0 || ^24.0.0");
  assert.deepEqual(manifest.dependencies, {
    "openapi-fetch": "0.15.0",
    "openapi-typescript-helpers": "0.0.15",
  });
  // A production install cannot rely on the checkout's hoisted development dependencies.
  const dependencyTree = JSON.parse(
    run(process.execPath, [npmCli, "ls", "--all", "--omit=dev", "--json"], consumer),
  ) as { dependencies: Record<string, { dependencies: Record<string, unknown> }> };
  assert.deepEqual(Object.keys(dependencyTree.dependencies), ["circleso"]);
  assert.deepEqual(
    Object.keys(dependencyTree.dependencies.circleso?.dependencies ?? {}).sort(),
    Object.keys(manifest.dependencies).sort(),
  );
  assert.deepEqual(Object.keys(manifest.exports), [".", "./admin", "./headless", "./auth"]);
  for (const [entry, conditions] of Object.entries(manifest.exports)) {
    const stem = entry === "." ? "index" : entry.slice(2);
    assert.deepEqual(conditions, {
      import: { types: `./dist/${stem}.d.ts`, default: `./dist/${stem}.js` },
      require: { types: `./dist/${stem}.d.cts`, default: `./dist/${stem}.cjs` },
    });
    for (const condition of Object.values(conditions)) {
      assert.deepEqual(Object.keys(condition), ["types", "default"]);
      for (const file of Object.values(condition)) assert.ok(names.includes(file.slice(2)), file);
    }
  }
  const publicDocs = documentationFiles(root).filter((file) => file.startsWith("docs/"));
  for (const file of [
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "CONTRIBUTING.md",
    "SUPPORT.md",
    "SECURITY.md",
    ...publicDocs,
  ]) {
    assert.ok(names.includes(file), `Missing packaged documentation: ${file}`);
    assert.equal(
      await readFile(path.join(installed, file), "utf8"),
      await readFile(path.join(root, file), "utf8"),
    );
    if (file.endsWith(".md"))
      for (const href of markdownLinks(await readFile(path.join(installed, file), "utf8"))) {
        if (/^[a-z][\w+.-]*:/i.test(href) || href.startsWith("//")) continue;
        const pathname = decodeURIComponent(href.split("#")[0] ?? "");
        const target = pathname
          ? path.posix.normalize(path.posix.join(path.posix.dirname(file), pathname))
          : file;
        assert.ok(names.includes(target), `Packaged ${file} links to omitted ${target}`);
      }
  }
  let maps = 0;
  let declarationBytes = 0;
  for (const file of names.filter((name) => /\.d\.(?:ts|cts)$/.test(name))) {
    declarationBytes += (await readFile(path.join(installed, file))).byteLength;
  }
  assert.ok(declarationBytes <= 3 * 1024 * 1024, "Declarations exceed the 3 MiB review budget");
  for (const file of names.filter((name) => /\.(?:js|cjs)$/.test(name))) {
    const source = await readFile(path.join(installed, file), "utf8");
    assert.ok(Buffer.byteLength(source) <= 350 * 1024, `${file} exceeds 350 KiB`);
    assert.ok(gzipSync(source).byteLength <= 70 * 1024, `${file} exceeds 70 KiB gzip`);
    const mapName = `${file}.map`;
    assert.ok(names.includes(mapName), mapName);
    assert.ok(source.includes(`//# sourceMappingURL=${path.basename(mapName)}`));
    const map = await json<{
      version: number;
      sources: string[];
      sourcesContent: string[];
      mappings: string;
    }>(path.join(installed, mapName));
    assert.equal(map.version, 3);
    assert.ok(map.mappings.length);
    assert.ok(map.sources.length);
    assert.equal(map.sources.length, map.sourcesContent.length);
    for (const [index, name] of map.sources.entries()) {
      assert.match(
        name,
        /^(?:\.\.\/src\/.+\.ts|\.\.\/node_modules\/@noble\/hashes\/(?:_u64|_md|utils|legacy)\.js)$/,
      );
      assert.doesNotMatch(name, /(?:\.test\.ts|type-tests|v1-release|examples|\.cache)/);
      assert.equal(
        map.sourcesContent[index],
        await readFile(path.resolve(root, "dist", name), "utf8"),
      );
    }
    maps++;
  }
  assert.equal(
    (await json<{ version: string }>(path.join(root, "node_modules/@noble/hashes/package.json")))
      .version,
    "2.4.0",
  );
  assert.ok(
    (await readFile(path.join(installed, "LICENSE"), "utf8")).includes(
      await readFile(path.join(root, "node_modules/@noble/hashes/LICENSE"), "utf8"),
    ),
  );
  for (const file of names.filter((name) => /\.(?:js|cjs|d\.ts|d\.cts)$/.test(name))) {
    assert.doesNotMatch(
      await readFile(path.join(installed, file), "utf8"),
      /(?:from\s*["']|require\(["'])@noble\/hashes/,
    );
  }
  console.log(
    `Package size budgets: ${declarationBytes} declaration bytes; runtime <=350 KiB/70 KiB gzip per file`,
  );
  for (const file of ["runtime.mjs", "measure.mjs"])
    await copyFile(path.join(fixtures, file), path.join(consumer, file));
  process.stdout.write(
    run(process.execPath, ["--enable-source-maps", path.join(consumer, "runtime.mjs")], consumer),
  );
  process.stdout.write(run(process.execPath, [path.join(fixtures, "browser.mjs"), consumer], root));
  process.stdout.write(
    run(process.execPath, ["--expose-gc", path.join(consumer, "measure.mjs")], consumer),
  );

  const types = await readFile(path.join(fixtures, "types.txt"), "utf8");
  for (const extension of ["mts", "cts"]) {
    await writeFile(path.join(consumer, `types.${extension}`), types);
    await copyFile(
      path.join(fixtures, "workflow.txt"),
      path.join(consumer, `workflow.${extension}`),
    );
  }
  await copyFile(
    path.join(root, "scripts/fixtures/acceptance/native.mjs"),
    path.join(consumer, "native.mjs"),
  );
  await copyFile(path.join(fixtures, "require.txt"), path.join(consumer, "require.cts"));
  await copyFile(path.join(fixtures, "types-only.txt"), path.join(consumer, "types-only.cts"));
  const documentation: string[] = [];
  for (const file of documentationFiles(root)) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const [index, block] of typescriptBlocks(source).entries()) {
      const filename = `doc-${file.replaceAll(/[\\/]/g, "-")}-${index}.${block.extension}`;
      await writeFile(path.join(consumer, filename), block.source);
      documentation.push(filename);
    }
  }
  const examples = run("git", ["ls-files", "--", "examples/*.ts"], root)
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  for (const file of examples) {
    assert.match(file, /^examples\/[\w-]+\.ts$/);
    const filename = `example-${path.basename(file, ".ts")}.mts`;
    await copyFile(path.join(root, file), path.join(consumer, filename));
    documentation.push(filename);
  }
  const matrices: string[] = [];
  for (const compiler of ["typescript", "typescript-current"]) {
    const compilerPackagePath = require.resolve(`${compiler}/package.json`);
    const compilerPackage = await json<{ version: string; bin: { tsc: string } }>(
      compilerPackagePath,
    );
    const cli = path.resolve(path.dirname(compilerPackagePath), compilerPackage.bin.tsc);
    for (const resolution of ["Node16", "NodeNext", "Bundler"]) {
      const configFile = path.join(consumer, "tsconfig.json");
      await writeFile(
        configFile,
        JSON.stringify({
          compilerOptions: {
            target: "ES2022",
            module: resolution === "Bundler" ? "Preserve" : resolution,
            moduleResolution: resolution,
            lib: ["ES2022", "DOM", "DOM.Iterable"],
            types: [],
            strict: true,
            exactOptionalPropertyTypes: true,
            noUncheckedIndexedAccess: true,
            skipLibCheck: false,
            outDir: `workflow-${compiler}-${resolution}`,
          },
          files: [
            "types.mts",
            "types.cts",
            "require.cts",
            "types-only.cts",
            "workflow.mts",
            "workflow.cts",
          ],
        }),
      );
      const trace = compiler === "typescript" && resolution === "Node16";
      const output = run(
        process.execPath,
        [cli, "-p", configFile, "--extendedDiagnostics", ...(trace ? ["--traceResolution"] : [])],
        consumer,
      );
      console.log(
        `Package compiler measurements: ${compilerPackage.version}/${resolution}; ${output
          .split(/\r?\n/)
          .filter((line) => /^(?:Memory used|Check time|Total time):/.test(line))
          .join("; ")}`,
      );
      if (trace) {
        for (const entry of ["index", "admin", "headless", "auth"]) {
          for (const extension of ["d.ts", "d.cts"]) {
            assert.ok(
              output.replaceAll("\\", "/").includes(`/dist/${entry}.${extension}'`),
              `Missing declaration resolution: ${entry}.${extension}`,
            );
          }
        }
      }
      const outputDirectory = `workflow-${compiler}-${resolution}`;
      if (resolution === "Bundler") {
        // module:Preserve intentionally leaves imports for the application's build step.
        // Transform only; actual installed package imports/requires remain external.
        for (const [extension, format] of [
          ["mjs", "esm"],
          ["cjs", "cjs"],
        ] as const) {
          const emitted = path.join(consumer, outputDirectory, `workflow.${extension}`);
          const result = await transform(await readFile(emitted, "utf8"), {
            format,
            target: "es2022",
            sourcefile: emitted,
          });
          await writeFile(emitted, result.code);
        }
      }
      await writeFile(
        path.join(consumer, "app.mjs"),
        `import {compose} from './${outputDirectory}/workflow.mjs'; import {fixture} from './native.mjs'; await fixture(compose);`,
      );
      await writeFile(
        path.join(consumer, "app.cjs"),
        `const {compose} = require('./${outputDirectory}/workflow.cjs'); import('./native.mjs').then(({fixture})=>fixture(compose)).catch(error=>{console.error(error);process.exitCode=1;});`,
      );
      for (const app of ["app.mjs", "app.cjs"])
        run(process.execPath, [path.join(consumer, app)], consumer, {
          NODE_EXTRA_CA_CERTS: path.join(root, "scripts/fixtures/acceptance/test-cert.pem"),
          CIRCLE_FIXTURE_CERT: path.join(root, "scripts/fixtures/acceptance/test-cert.pem"),
          CIRCLE_FIXTURE_KEY: path.join(root, "scripts/fixtures/acceptance/test-key.pem"),
        });
      console.log(
        `Package composition: TS ${compilerPackage.version}/${resolution}; actual ESM and CJS applications; native auth/refresh/iterators/HTTPS upload/rich-text/cookies/errors/cancel pass`,
      );
      matrices.push(`${compilerPackage.version}/${resolution}`);
      console.log(
        `Package types: TS ${compilerPackage.version}; ${resolution}; ESM/CJS; strict; skipLibCheck=false pass`,
      );
    }
    const docConfig = path.join(consumer, "tsconfig.docs.json");
    await writeFile(
      docConfig,
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          exactOptionalPropertyTypes: true,
          skipLibCheck: false,
          noEmit: true,
          types: ["node"],
          typeRoots: [path.join(root, "node_modules/@types")],
        },
        files: documentation,
      }),
    );
    run(process.execPath, [cli, "-p", docConfig], consumer);
    console.log(
      `Package docs: TS ${compilerPackage.version}; ${documentation.length - examples.length} TS blocks + ${examples.length} tracked TS examples compile against installed exports`,
    );
  }
  // Explicit synthetic allowlist only: do not execute credential-driven examples.
  const securityRecipe = path.join(consumer, "doc-docs-security-review.md-0.mts");
  const compiledSecurity = await transform(await readFile(securityRecipe, "utf8"), {
    loader: "ts",
    format: "esm",
    target: "es2022",
    sourcefile: securityRecipe,
  });
  await writeFile(path.join(consumer, "pinned-fetch.mjs"), compiledSecurity.code);
  await copyFile(path.join(fixtures, "security.mjs"), path.join(consumer, "security.mjs"));
  process.stdout.write(
    run(process.execPath, [path.join(consumer, "security.mjs")], consumer, {
      NODE_EXTRA_CA_CERTS: path.join(root, "scripts/fixtures/acceptance/test-cert.pem"),
      CIRCLE_FIXTURE_CERT: path.join(root, "scripts/fixtures/acceptance/test-cert.pem"),
      CIRCLE_FIXTURE_KEY: path.join(root, "scripts/fixtures/acceptance/test-key.pem"),
    }),
  );
  for (const name of ["auth-and-cookies", "documented-workflows"]) {
    const input = path.join(consumer, `example-${name}.mts`);
    const output = path.join(consumer, `example-${name}.mjs`);
    const transformed = await transform(await readFile(input, "utf8"), {
      loader: "ts",
      format: "esm",
      target: "es2022",
      sourcefile: input,
    });
    await writeFile(output, transformed.code);
    process.stdout.write(run(process.execPath, [output], consumer));
  }
  if (process.argv.includes("--browser")) {
    const vitestCli = path.join(path.dirname(require.resolve("vitest/package.json")), "vitest.mjs");
    process.stdout.write(
      run(process.execPath, [vitestCli, "run", "--config", "vitest.browser.config.ts"], root, {
        CIRCLE_ACCEPTANCE_CONSUMER: consumer,
      }),
    );
  }
  if (process.argv.includes("--live")) {
    await copyFile(
      path.join(root, "scripts/fixtures/acceptance/live.mjs"),
      path.join(consumer, "live.mjs"),
    );
    for (const name of ["integration-policy", "integration-workflow"]) {
      const result = await transform(
        await readFile(path.join(root, `scripts/${name}.ts`), "utf8"),
        { loader: "ts", format: "esm", target: "es2022" },
      );
      await writeFile(path.join(consumer, `${name}.mjs`), result.code);
    }
    process.stdout.write(run(process.execPath, [path.join(consumer, "live.mjs")], consumer));
  }
  const evidence = {
    version: manifest.version,
    node: process.version,
    integrity: packed.integrity,
    files: names.length,
    maps,
    compilers: matrices,
    docBlocks: documentation.length - examples.length,
    examples: examples.length,
  };
  await mkdir(path.join(root, ".cache"), { recursive: true });
  await writeFile(
    path.join(root, ".cache/package-check.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(
    `Actual tarball qualification passed: ${names.length} allowlisted files; ${maps} verified source maps; ${packed.integrity}`,
  );
} finally {
  // temp is returned by mkdtemp under the OS temp directory, never a user-supplied path.
  assert.equal(path.dirname(temp), os.tmpdir());
  assert.ok(path.basename(temp).startsWith("circleso-package-"));
  await rm(temp, { recursive: true, force: true });
}
