import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const require = createRequire(import.meta.url);
const fixtures = path.join(root, "scripts/fixtures/consumers");
const npmCli = process.env.npm_execpath;
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

function run(file: string, args: string[], cwd: string): string {
  const result = spawnSync(file, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    timeout: 120_000,
    env: { ...process.env, NODE_PATH: "" },
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
  const [packed] = JSON.parse(
    run(
      process.execPath,
      [npmCli, "pack", "--json", "--ignore-scripts", "--pack-destination", temp],
      root,
    ),
  ) as Packed[];
  assert.ok(packed);
  const tarball = path.join(temp, packed.filename);
  const bytes = await readFile(tarball);
  assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, packed.integrity);
  const names = packed.files.map(({ path: file }) => file);
  for (const file of names) {
    assert.ok(
      ["package.json", "README.md", "CHANGELOG.md", "LICENSE"].includes(file) ||
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
  for (const file of ["README.md", "CHANGELOG.md", "LICENSE"]) {
    assert.equal(
      await readFile(path.join(installed, file), "utf8"),
      await readFile(path.join(root, file), "utf8"),
    );
  }
  let maps = 0;
  for (const file of names.filter((name) => /\.(?:js|cjs)$/.test(name))) {
    const source = await readFile(path.join(installed, file), "utf8");
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
  for (const file of ["runtime.mjs"])
    await copyFile(path.join(fixtures, file), path.join(consumer, file));
  process.stdout.write(
    run(process.execPath, ["--enable-source-maps", path.join(consumer, "runtime.mjs")], consumer),
  );
  process.stdout.write(run(process.execPath, [path.join(fixtures, "browser.mjs"), consumer], root));

  const types = await readFile(path.join(fixtures, "types.txt"), "utf8");
  for (const extension of ["mts", "cts"])
    await writeFile(path.join(consumer, `types.${extension}`), types);
  await copyFile(path.join(fixtures, "require.txt"), path.join(consumer, "require.cts"));
  await copyFile(path.join(fixtures, "types-only.txt"), path.join(consumer, "types-only.cts"));
  const documentation: string[] = [];
  for (const file of [
    "README.md",
    "docs/request-options.md",
    "docs/admin-workflows-and-filters.md",
    "docs/admin-remaining-resources.md",
    "docs/pagination.md",
    "docs/file-uploads.md",
    "docs/rich-text.md",
  ]) {
    const source = await readFile(path.join(root, file), "utf8");
    for (const [index, block] of [...source.matchAll(/```ts\r?\n([\s\S]*?)```/g)].entries()) {
      assert.ok(block[1]);
      const filename = `doc-${path.basename(file)}-${index}.mts`;
      await writeFile(path.join(consumer, filename), block[1]);
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
            noEmit: true,
          },
          files: ["types.mts", "types.cts", "require.cts", "types-only.cts"],
        }),
      );
      const trace = compiler === "typescript" && resolution === "Node16";
      const output = run(
        process.execPath,
        [cli, "-p", configFile, ...(trace ? ["--traceResolution"] : [])],
        consumer,
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
      `Package docs: TS ${compilerPackage.version}; ${documentation.length - examples.length} TS blocks + ${examples.length} tracked TS examples compile (never executed)`,
    );
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
