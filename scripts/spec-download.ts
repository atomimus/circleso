import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  CircleTimeoutError,
} from "../src/core/errors";
import {
  failure,
  generatedFile,
  loadSpecs,
  type Output,
  parseSpec,
  renderTypes,
  type SpecEntry,
  specFile,
  writeOutputs,
} from "./spec-tools";

const MAX_BYTES = 10 * 1024 * 1024;

export async function downloadSpec(
  spec: SpecEntry,
  fetcher = fetch,
  timeoutMs = 30_000,
): Promise<Buffer> {
  const signal = AbortSignal.timeout(timeoutMs);
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let body: ReadableStream<Uint8Array> | null = null;
  try {
    const response = await fetcher(spec.url, { signal, redirect: "error" });
    body = response.body;
    if (!response.ok) {
      throw new CircleHttpError(`Spec download failed: ${response.status} ${spec.url}`, {
        status: response.status,
        url: spec.url,
        method: "GET",
      });
    }
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      ?.trim()
      .toLowerCase();
    if (
      !contentType ||
      ![
        "text/plain",
        "text/yaml",
        "text/x-yaml",
        "application/yaml",
        "application/x-yaml",
        "application/json",
      ].includes(contentType)
    ) {
      throw failure(`Unexpected content-type for ${spec.name}: ${contentType ?? "missing"}`);
    }
    if (Number(response.headers.get("content-length")) > MAX_BYTES)
      throw failure(`Spec exceeds ${MAX_BYTES} bytes: ${spec.name}`);
    if (!response.body) throw failure(`Empty spec response: ${spec.name}`);
    reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) throw failure(`Spec exceeds ${MAX_BYTES} bytes: ${spec.name}`);
      chunks.push(value);
    }
    if (!size) throw failure(`Empty spec response: ${spec.name}`);
    return Buffer.concat(chunks);
  } catch (cause) {
    if (signal.aborted) {
      const error = new CircleTimeoutError(`Spec download timed out: ${spec.url}`, timeoutMs);
      Object.defineProperty(error, "cause", { value: cause });
      throw error;
    }
    if (cause instanceof CircleHttpError || cause instanceof CircleConfigError) throw cause;
    throw new CircleNetworkError(`Spec download failed: ${spec.url}`, cause);
  } finally {
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    } else if (body) void body.cancel().catch(() => {});
  }
}

export type Candidate = { spec: SpecEntry; bytes: Buffer; generated: string };

async function downloadInputs(
  root: string,
  fetcher: typeof fetch,
): Promise<{ spec: SpecEntry; bytes: Buffer; source: string }[]> {
  const inputs: { spec: SpecEntry; bytes: Buffer; source: string }[] = [];
  for (const spec of await loadSpecs(root)) {
    const bytes = await downloadSpec(spec, fetcher);
    let source: string;
    try {
      source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch (cause) {
      throw failure(`Invalid UTF-8: ${spec.url}`, cause);
    }
    parseSpec(source, spec);
    inputs.push({ spec, bytes, source });
  }
  return inputs;
}

export async function downloadCandidates(root: string, fetcher = fetch): Promise<Candidate[]> {
  const candidates: Candidate[] = [];
  for (const { spec, bytes, source } of await downloadInputs(root, fetcher)) {
    candidates.push({ spec, bytes, generated: await renderTypes(source, spec) });
  }
  return candidates;
}

export async function syncSpecs(root: string, fetcher = fetch): Promise<void> {
  const candidates = await downloadCandidates(root, fetcher);
  await writeOutputs(
    candidates.map(({ spec, bytes }) => ({
      file: path.join(root, specFile(spec)),
      contents: bytes,
    })),
  );
}

/** Read-only with respect to tracked specs/types; changed candidates and unified patches stay inspectable. */
export async function checkLiveSpecs(root: string, fetcher = fetch): Promise<string | null> {
  const inputs = await downloadInputs(root, fetcher);
  const changed: { file: string; before: Buffer; after: Buffer }[] = [];
  const generationErrors: { name: string; message: string }[] = [];
  for (const { spec, bytes, source } of inputs) {
    const outputs: Output[] = [{ file: specFile(spec), contents: bytes }];
    try {
      outputs.push({ file: generatedFile(spec), contents: await renderTypes(source, spec) });
    } catch (cause) {
      generationErrors.push({
        name: spec.name,
        message: cause instanceof Error ? cause.message : "Generation failed",
      });
    }
    for (const { file, contents } of outputs) {
      const before = await readFile(path.join(root, file));
      const after = Buffer.from(contents);
      if (!before.equals(after)) changed.push({ file, before, after });
    }
  }
  if (!changed.length && !generationErrors.length) return null;
  const cache = path.join(root, ".cache");
  await mkdir(cache, { recursive: true });
  const report = await mkdtemp(path.join(cache, "spec-refresh-"));
  try {
    const summary: string[] = [
      "Candidate upstream refresh; tracked inputs/outputs were not modified.",
    ];
    for (const error of generationErrors) {
      await writeFile(
        path.join(report, `${error.name}.generation-error.txt`),
        `${error.message}\n`,
      );
      summary.push(
        `${error.name}: generation failed; inspect the saved spec diff and generation-error.txt`,
      );
    }
    for (const { file, before, after } of changed) {
      const oldPath = path.join(report, "before", file);
      const newPath = path.join(report, "after", file);
      await mkdir(path.dirname(oldPath), { recursive: true });
      await mkdir(path.dirname(newPath), { recursive: true });
      await writeFile(oldPath, before);
      await writeFile(newPath, after);
      const diff = spawnSync(
        "git",
        [
          "-c",
          "core.autocrlf=false",
          "diff",
          "--no-index",
          "--no-ext-diff",
          "--no-textconv",
          "--",
          oldPath,
          newPath,
        ],
        { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
      );
      if (diff.error || diff.status !== 1)
        throw failure(`Cannot produce refresh diff for ${file}`, diff.error ?? diff.stderr);
      await writeFile(path.join(report, `${path.basename(file)}.patch`), diff.stdout);
      const hash = (input: Buffer) => createHash("sha256").update(input).digest("hex");
      summary.push(`${file}\n  before SHA-256 ${hash(before)}\n  after  SHA-256 ${hash(after)}`);
    }
    await writeFile(path.join(report, "README.txt"), `${summary.join("\n")}\n`);
    return report;
  } catch (cause) {
    await rm(report, { recursive: true, force: true });
    throw failure("Cannot save live spec refresh report", cause);
  }
}
