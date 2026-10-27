import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseYaml } from "@redocly/openapi-core";
import openapiTS, { astToString, COMMENT_HEADER } from "openapi-typescript";
import { CircleConfigError } from "../src/core/errors";
import { applySpecOverrides } from "./spec-overrides";

export const METHODS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
  "trace",
] as const;
export type Method = (typeof METHODS)[number];
export type JsonObject = Record<string, unknown>;
export type SpecEntry = {
  name: string;
  url: string;
  title: string;
  version: string;
  pathPrefix: string;
  module: string;
};
export type Output = { file: string; contents: string | Uint8Array };

export function failure(message: string, cause?: unknown): CircleConfigError {
  const error = new CircleConfigError(message);
  if (cause !== undefined) Object.defineProperty(error, "cause", { value: cause });
  return error;
}

export function object(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function specFile(spec: SpecEntry): string {
  return `api/specs/${spec.name}.yaml`;
}

export function generatedFile(spec: SpecEntry): string {
  return `src/generated/${spec.name}.d.ts`;
}

export async function loadSpecs(root: string): Promise<SpecEntry[]> {
  try {
    const config: unknown = JSON.parse(
      await readFile(path.join(root, "api/specs/sources.json"), "utf8"),
    );
    if (!object(config) || !Array.isArray(config.specs) || !config.specs.length) {
      throw failure("Expected a nonempty specs array");
    }
    const names = new Set<string>();
    const urls = new Set<string>();
    return config.specs.map((entry: unknown, index: number) => {
      if (
        !object(entry) ||
        ["name", "url", "title", "version", "pathPrefix", "module"].some(
          (key) => typeof entry[key] !== "string" || !entry[key],
        )
      )
        throw failure(`Invalid spec entry ${index}`);
      const spec = entry as SpecEntry;
      const url = new URL(spec.url);
      if (
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(spec.name) ||
        !/^[a-zA-Z]+Api$/.test(spec.module) ||
        !spec.pathPrefix.startsWith("/api/") ||
        url.protocol !== "https:" ||
        url.hostname !== "api-headless.circle.so" ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        names.has(spec.name) ||
        urls.has(spec.url)
      )
        throw failure(`Invalid or duplicate spec entry ${index}`);
      names.add(spec.name);
      urls.add(spec.url);
      return spec;
    });
  } catch (cause) {
    throw failure("Cannot load api/specs/sources.json", cause);
  }
}

export function parseSpec(source: string, spec: SpecEntry): JsonObject {
  try {
    const doc: unknown = parseYaml(source);
    if (
      !object(doc) ||
      !/^3\.[01](?:\.|$)/.test(String(doc.openapi)) ||
      !object(doc.info) ||
      doc.info.title !== spec.title ||
      doc.info.version !== spec.version ||
      !object(doc.paths)
    ) {
      throw failure(`Expected OpenAPI 3.0/3.1, ${spec.title} (${spec.version}), and paths`);
    }
    let operations = 0;
    for (const [route, item] of Object.entries(doc.paths)) {
      if (!route.startsWith(`${spec.pathPrefix}/`) && route !== spec.pathPrefix) {
        throw failure(`Unexpected API path ${route}`);
      }
      if (!object(item)) throw failure(`Invalid path item ${route}`);
      for (const method of METHODS) {
        const operation = item[method];
        if (operation === undefined) continue;
        if (
          !object(operation) ||
          !object(operation.responses) ||
          !Object.keys(operation.responses).length
        ) {
          throw failure(`Missing responses for ${method.toUpperCase()} ${route}`);
        }
        operations++;
      }
    }
    if (!operations) throw failure("Spec contains no HTTP operations");
    // Refuse external refs before the generator/resolver can touch the network or local files.
    const ancestors = new Set<unknown>();
    const visited = new Set<unknown>();
    function visit(value: unknown): void {
      if (typeof value !== "object" || value === null) return;
      if (ancestors.has(value)) throw failure("Cyclic YAML aliases are unsupported");
      if (visited.has(value)) return;
      ancestors.add(value);
      for (const [key, child] of Object.entries(value)) {
        if (
          ["$ref", "externalValue"].includes(key) &&
          (typeof child !== "string" || !child.startsWith("#/"))
        ) {
          throw failure(
            "Only document-local references/examples are allowed; generation must stay offline",
          );
        }
        if (
          key === "discriminator" &&
          object(child) &&
          object(child.mapping) &&
          Object.values(child.mapping).some(
            (ref) =>
              typeof ref !== "string" || (!ref.startsWith("#/") && !/^[a-zA-Z0-9_.-]+$/.test(ref)),
          )
        ) {
          throw failure(
            "External discriminator mappings are unsupported; generation must stay offline",
          );
        }
        visit(child);
      }
      ancestors.delete(value);
      visited.add(value);
    }
    visit(doc);
    return doc;
  } catch (cause) {
    throw failure(
      `Invalid ${spec.name} spec: ${cause instanceof Error ? cause.message : "parse failure"}`,
      cause,
    );
  }
}

export async function renderTypes(source: string, spec: SpecEntry): Promise<string> {
  try {
    parseSpec(source, spec);
    const input = spec.name === "admin-v2" ? applySpecOverrides(source) : source;
    const ast = await openapiTS(input, { alphabetize: true });
    const result = `${COMMENT_HEADER}${astToString(ast)}`;
    if (!/export\s+(interface|type)\s+paths\b/.test(result))
      throw failure("Missing exported paths");
    return result;
  } catch (cause) {
    throw failure(
      `Cannot generate ${generatedFile(spec)} from ${specFile(spec)}: ${cause instanceof Error ? cause.message : "generation failure"}`,
      cause,
    );
  }
}

async function previous(file: string): Promise<Buffer | null> {
  try {
    return await readFile(file);
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw cause;
  }
}

// Each replacement is a same-directory rename. Never unlink the destination to make it succeed.
// Validate/render the entire batch before calling this. Roll back completed renames on an I/O failure.
export async function writeOutputs(outputs: Output[], move: typeof rename = rename): Promise<void> {
  const staged: { file: string; temp: string; prior: Buffer | null }[] = [];
  const completed: typeof staged = [];
  let keepRecoveryFiles = false;
  try {
    for (const output of outputs) {
      const prior = await previous(output.file);
      if (prior?.equals(Buffer.from(output.contents))) continue;
      await mkdir(path.dirname(output.file), { recursive: true });
      const temp = `${output.file}.tmp-${randomUUID()}`;
      staged.push({ file: output.file, temp, prior });
      await writeFile(temp, output.contents, { flag: "wx" });
    }
    for (const entry of staged) {
      await move(entry.temp, entry.file);
      completed.push(entry);
    }
  } catch (cause) {
    const recoveryErrors: unknown[] = [];
    for (const entry of completed.reverse()) {
      try {
        if (entry.prior === null) await rm(entry.file);
        else {
          await writeFile(entry.temp, entry.prior);
          await rename(entry.temp, entry.file);
        }
      } catch (error) {
        recoveryErrors.push(error);
      }
    }
    keepRecoveryFiles = recoveryErrors.length > 0;
    throw failure(
      keepRecoveryFiles
        ? "Output replacement and rollback failed; retain .tmp-* recovery files and inspect the checkout"
        : "Output replacement failed; prior outputs restored",
      new AggregateError([cause, ...recoveryErrors], "File replacement failure", { cause }),
    );
  } finally {
    if (!keepRecoveryFiles)
      await Promise.all(staged.map((entry) => rm(entry.temp, { force: true })));
  }
}

export async function checkOutputs(outputs: Output[], remedy: string): Promise<void> {
  const stale: string[] = [];
  for (const output of outputs) {
    if (!(await previous(output.file))?.equals(Buffer.from(output.contents)))
      stale.push(output.file);
  }
  if (stale.length) throw failure(`Stale or missing outputs:\n${stale.join("\n")}\nRun ${remedy}`);
}

export async function generate(root: string, check = false): Promise<void> {
  const outputs: Output[] = [];
  for (const spec of await loadSpecs(root)) {
    try {
      outputs.push({
        file: path.join(root, generatedFile(spec)),
        contents: await renderTypes(await readFile(path.join(root, specFile(spec)), "utf8"), spec),
      });
    } catch (cause) {
      throw failure(`Generation failed for ${spec.name}; no outputs changed`, cause);
    }
  }
  if (check) await checkOutputs(outputs, "npm run gen:types");
  else await writeOutputs(outputs);
}

export function checkArgs(allowed: string[]): string[] {
  const args = process.argv.slice(2);
  if (args.some((arg) => !allowed.includes(arg)))
    throw failure(`Expected only ${allowed.join(", ") || "no arguments"}`);
  return args;
}

export function cli(run: () => Promise<void>): void {
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Spec tooling failed");
    let cause: unknown = error instanceof Error ? error.cause : undefined;
    while (cause instanceof Error) {
      console.error(`Caused by: ${cause.message}`);
      cause = cause.cause;
    }
    process.exitCode = 1;
  });
}
