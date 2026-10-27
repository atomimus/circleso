import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";

const roots: string[] = [];
const command = path.resolve("scripts/lint.ts");

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it("checks tracked contents, rejects source errors, and leaves private/deleted files alone", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-lint-"));
  roots.push(root);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "core.autocrlf", "false"], { cwd: root });
  await writeFile(path.join(root, ".gitignore"), "node_modules/\n");
  await writeFile(path.join(root, "biome.json"), await readFile("biome.json"));
  const tracked = "source with spaces.ts";
  await writeFile(path.join(root, tracked), "export const value = 1;\n");
  await writeFile(path.join(root, "deleted.ts"), "export const gone = 1;\n");
  execFileSync("git", ["add", "--", "biome.json", tracked, "deleted.ts"], { cwd: root });
  await unlink(path.join(root, "deleted.ts"));
  const privateContents = "private-untracked-sentinel invalid javascript {{{";
  await writeFile(path.join(root, "private.js"), privateContents);
  const run = () =>
    spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), command], {
      cwd: root,
      encoding: "utf8",
      shell: false,
    });
  const valid = run();
  expect(valid.status, valid.stdout + valid.stderr).toBe(0);
  // Modify working-tree source after staging: the linter must read the new contents.
  await writeFile(path.join(root, tracked), "export const value = ;\n");
  const invalid = run();
  expect(invalid.status).not.toBe(0);
  expect(invalid.stdout + invalid.stderr).toContain(tracked);
  expect(invalid.stdout + invalid.stderr).not.toContain("private-untracked-sentinel");
  expect(await readFile(path.join(root, "private.js"), "utf8")).toBe(privateContents);
}, 15_000);

it("keeps formatter inputs LF in a checkout with Windows autocrlf enabled", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-eol-"));
  roots.push(root);
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["config", "core.autocrlf", "true"], { cwd: root });
  await writeFile(path.join(root, ".gitattributes"), await readFile(".gitattributes"));
  await writeFile(path.join(root, "sample.ts"), "export const value = 1;\n");
  execFileSync("git", ["add", "--", ".gitattributes", "sample.ts"], { cwd: root });
  await unlink(path.join(root, "sample.ts"));
  execFileSync("git", ["checkout-index", "--", "sample.ts"], { cwd: root });
  expect(await readFile(path.join(root, "sample.ts"), "utf8")).toBe("export const value = 1;\n");
});
