import { createWriteStream } from "node:fs";
import { mkdir, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { Readable, Transform } from "node:stream";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { pipeline } from "node:stream/promises";

type SpecEntry = {
  url: string;
  output: string;
};

const SPECS: SpecEntry[] = [
  {
    url: "https://api-headless.circle.so/api/admin/v2/swagger.yaml",
    output: "api/specs/admin-v2.yaml",
  },
  {
    url: "https://api-headless.circle.so/api/headless_client/v1/swagger.yaml",
    output: "api/specs/headless-client-v1.yaml",
  },
  {
    url: "https://api-headless.circle.so/api/headless_auth/swagger.yaml",
    output: "api/specs/headless-auth-v1.yaml",
  },
];

const ROOT = process.cwd();

async function downloadSpec(spec: SpecEntry) {
  const response = await fetch(spec.url);
  if (!response.ok) {
    throw new Error(`Failed to download ${spec.url}: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType) {
    throw new Error(`Missing content-type for ${spec.url}`);
  }
  if (!isExpectedContentType(contentType)) {
    throw new Error(`Unexpected content-type for ${spec.url}: ${contentType}`);
  }

  if (!response.body) {
    throw new Error(`Empty response body for ${spec.url}`);
  }

  const outputPath = path.resolve(ROOT, spec.output);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp-${process.pid}-${Date.now()}`;

  let bytes = 0;
  const counter = new Transform({
    transform(chunk, _encoding, callback) {
      bytes += chunk.length;
      callback(null, chunk);
    },
  });

  try {
    const bodyStream = response.body as unknown as WebReadableStream<Uint8Array>;
    await pipeline(Readable.fromWeb(bodyStream), counter, createWriteStream(tempPath));
    if (bytes === 0) {
      throw new Error(`Received empty body from ${spec.url}`);
    }
    await replaceFile(tempPath, outputPath);
  } catch (error) {
    await safeUnlink(tempPath);
    throw error;
  }

  return { bytes, outputPath };
}

function isExpectedContentType(contentType: string) {
  const normalized = contentType.toLowerCase();
  return (
    normalized.includes("yaml") ||
    normalized.includes("yml") ||
    normalized.includes("json") ||
    normalized.startsWith("text/plain")
  );
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

async function run() {
  for (const spec of SPECS) {
    const { bytes, outputPath } = await downloadSpec(spec);
    const relativePath = path.relative(ROOT, outputPath);
    console.log(`${bytes} bytes ${relativePath} ${spec.url}`);
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
