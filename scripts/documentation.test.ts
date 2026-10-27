import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect, it } from "vitest";
import {
  checkDocumentationLinks,
  documentationFiles,
  headingIds,
  typescriptBlocks,
} from "./documentation";

it("discovers new staged public Markdown without reading untracked private files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-docs-git-"));
  try {
    execFileSync("git", ["init"], { cwd: root, stdio: "ignore" });
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "README.md"), "# Public");
    await writeFile(path.join(root, "docs/reference.md"), "# Reference");
    await writeFile(path.join(root, "private.md"), "```ts\nprivate unclosed fence");
    execFileSync("git", ["add", "--", "README.md", "docs/reference.md"], { cwd: root });
    expect(documentationFiles(root)).toEqual(["README.md", "docs/reference.md"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

it("discovers TypeScript fence aliases and longer fences without compiling nested prose", () => {
  expect(
    typescriptBlocks(
      "```ts title=example\nconst a = 1;\n```\n~~~typescript\nconst b = 2;\n~~~\n````text\n```ts\nignored\n```\n````\n```cts\nexport {};\n```",
    ),
  ).toEqual([
    { source: "const a = 1;", extension: "mts" },
    { source: "const b = 2;", extension: "mts" },
    { source: "export {};", extension: "cts" },
  ]);
  expect(() => typescriptBlocks("```typescript\nunclosed")).toThrow("Unclosed");
  expect(() => typescriptBlocks("```tsx\n<div />\n```")).toThrow("compiler fixture");
});

it("matches Markdown heading anchors including duplicate headings and inline code", () => {
  expect([...headingIds("# A `value`\n## A `value`\n```ts\n# fake\n```\n")]).toEqual([
    "a-value",
    "a-value-1",
  ]);
});

it("fails missing paths, anchors and private-planning links while accepting valid local links", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-docs-"));
  try {
    await mkdir(path.join(root, "docs"));
    await writeFile(path.join(root, "docs/guide.md"), "# Guide\n## Use `this`\n");
    const check = async (source: string) => {
      await writeFile(path.join(root, "README.md"), source);
      return checkDocumentationLinks(root, ["README.md"]);
    };
    await expect(
      check("[guide](docs/guide.md#use-this)\n[duplicate][g]\n[g]: docs/guide.md\n"),
    ).resolves.toBe(2);
    await expect(check("[broken](docs/missing.md)")).rejects.toThrow("broken link");
    await expect(check("[broken](docs/guide.md#nope)")).rejects.toThrow("broken anchor");
    await expect(check("[private](docs/v1-release/results/21.md)")).rejects.toThrow(
      "public documentation",
    );
    await expect(check("[outside](../other.md)")).rejects.toThrow("public documentation");
    await expect(check("[remote](https://example.test/)")).resolves.toBe(0);
    await expect(
      check("[repo](https://github.com/atomimus/circleso/blob/main/docs/guide.md#use-this)"),
    ).resolves.toBe(1);
    await expect(check("# Root\n[self](#root)")).resolves.toBe(1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

import { execFileSync } from "node:child_process";
