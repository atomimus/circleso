import { spawn } from "node:child_process";
import { access, mkdir, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";

type SpecDefinition = {
  input: string;
  output: string;
};

const SPECS: SpecDefinition[] = [
  {
    input: "api/specs/admin-v2.yaml",
    output: "src/generated/admin-v2.d.ts",
  },
  {
    input: "api/specs/headless-client-v1.yaml",
    output: "src/generated/headless-client-v1.d.ts",
  },
  {
    input: "api/specs/headless-auth-v1.yaml",
    output: "src/generated/headless-auth-v1.d.ts",
  },
];

const ROOT = process.cwd();

async function run() {
  const outDir = path.resolve(ROOT, "src", "generated");
  await mkdir(outDir, { recursive: true });

  for (const spec of SPECS) {
    const inputPath = path.resolve(ROOT, spec.input);
    const outputPath = path.resolve(ROOT, spec.output);
    await access(inputPath).catch(() => {
      throw new Error(`Spec not found: ${path.relative(ROOT, inputPath)}`);
    });

    const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;
    await runOpenApiTypescript(inputPath, tempPath);

    const contents = await readFile(tempPath, "utf8");
    if (!exportsPaths(contents)) {
      await safeUnlink(tempPath);
      throw new Error(`Generated file missing exported paths: ${path.relative(ROOT, outputPath)}`);
    }

    await replaceFile(tempPath, outputPath);

    const bytes = Buffer.byteLength(contents, "utf8");
    console.log(
      `${bytes} bytes ${path.relative(ROOT, outputPath)} ${path.relative(ROOT, inputPath)}`,
    );
  }
}

function exportsPaths(contents: string) {
  return /export\s+(interface|type)\s+paths\b/.test(contents);
}

async function runOpenApiTypescript(inputPath: string, outputPath: string) {
  const binName = process.platform === "win32" ? "openapi-typescript.cmd" : "openapi-typescript";
  const localBin = path.resolve(ROOT, "node_modules", ".bin", binName);
  const bin = (await access(localBin)
    .then(() => localBin)
    .catch(() => binName)) as string;
  const args = [inputPath, "-o", outputPath, "--alphabetize"];
  const useShell = process.platform === "win32" && bin.endsWith(".cmd");

  return new Promise<void>((resolve, reject) => {
    const child = spawn(bin, args, { stdio: "inherit", shell: useShell });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`openapi-typescript exited with code ${code}`));
    });
  });
}

async function replaceFile(tempPath: string, outputPath: string) {
  try {
    await rename(tempPath, outputPath);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EEXIST" || code === "EPERM" || code === "EACCES") {
      await safeUnlink(outputPath);
      await rename(tempPath, outputPath);
      return;
    }
    throw error;
  }
}

async function safeUnlink(filePath: string) {
  try {
    await unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
