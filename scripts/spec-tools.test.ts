import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CircleConfigError } from "../src/core/errors";
import { fixtureSource, fixtureSpec } from "./spec-fixtures";
import { generate, loadSpecs, parseSpec, writeOutputs } from "./spec-tools";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-spec-"));
  roots.push(root);
  await mkdir(path.join(root, "api/specs"), { recursive: true });
  await writeFile(
    path.join(root, "api/specs/sources.json"),
    JSON.stringify({ specs: [fixtureSpec] }),
  );
  await writeFile(path.join(root, "api/specs/fixture.yaml"), fixtureSource);
  return root;
}

afterEach(async () => {
  vi.unstubAllGlobals();
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("offline generation", () => {
  it("repeats identical bytes without network and detects stale or missing outputs without fixing them", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new CircleConfigError("Unexpected network");
      }),
    );
    const root = await fixture();
    const output = path.join(root, "src/generated/fixture.d.ts");
    await expect(generate(root, true)).rejects.toThrow("Stale or missing");
    await generate(root);
    const first = await readFile(output);
    await generate(root);
    expect(await readFile(output)).toEqual(first);
    await generate(root, true);
    await writeFile(output, "stale");
    await expect(generate(root, true)).rejects.toThrow("npm run gen:types");
    expect(await readFile(output, "utf8")).toBe("stale");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("preserves every prior output when a later input fails generation", async () => {
    const root = await fixture();
    await generate(root);
    const output = path.join(root, "src/generated/fixture.d.ts");
    const before = await readFile(output);
    const invalid = { ...fixtureSpec, name: "invalid" };
    // Use a distinct valid manifest URL, but an unresolved response reference.
    invalid.url = "https://api-headless.circle.so/invalid.yaml";
    await writeFile(
      path.join(root, "api/specs/sources.json"),
      JSON.stringify({ specs: [fixtureSpec, invalid] }),
    );
    await writeFile(
      path.join(root, "api/specs/fixture.yaml"),
      fixtureSource.replace("type: string", "type: number"),
    );
    await writeFile(
      path.join(root, "api/specs/invalid.yaml"),
      fixtureSource.replace("type: string", "$ref: '#/components/schemas/missing'"),
    );
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(generate(root)).rejects.toThrow("no outputs changed");
    } finally {
      errorLog.mockRestore();
    }
    expect(await readFile(output)).toEqual(before);
    expect(await readdir(path.dirname(output))).toEqual(["fixture.d.ts"]);
  });

  it("rejects invalid YAML, the wrong API, empty operations and external refs before resolving", () => {
    for (const source of [
      "<html>upstream error</html>",
      "openapi: [",
      fixtureSource.replace("Fixture API", "Wrong API"),
      fixtureSource.replace("/api/fixture/items", "/api/other/items"),
      fixtureSource.replace("type: string", "$ref: 'https://example.invalid/spec.yaml'"),
      "openapi: 3.0.1\ninfo: {title: Fixture API, version: v1}\npaths: {}",
    ])
      expect(() => parseSpec(source, fixtureSpec)).toThrow(CircleConfigError);
  });

  it("rejects duplicate manifest outputs and traversal names", async () => {
    const root = await fixture();
    for (const specs of [[fixtureSpec, fixtureSpec], [{ ...fixtureSpec, name: "../../escape" }]]) {
      await writeFile(path.join(root, "api/specs/sources.json"), JSON.stringify({ specs }));
      await expect(loadSpecs(root)).rejects.toThrow(CircleConfigError);
    }
  });

  it("rejects resolver-driven external examples and discriminator mappings offline", () => {
    const externalExample = fixtureSource.replace(
      "schema: {type: string}",
      "examples: {remote: {externalValue: 'https://example.invalid/data.json'}}",
    );
    const externalMapping = fixtureSource.replace(
      "schema: {type: string}",
      "schema: {type: object, discriminator: {propertyName: kind, mapping: {remote: 'https://example.invalid/type.yaml'}}}",
    );
    for (const source of [externalExample, externalMapping])
      expect(() => parseSpec(source, fixtureSpec)).toThrow("offline");
  });
});

describe("atomic output replacement", () => {
  it("rolls back successful replacements after a later rename fails, preserving old files and cleaning temps", async () => {
    const root = await fixture();
    const first = path.join(root, "first");
    const second = path.join(root, "second");
    await writeFile(first, "old first");
    await writeFile(second, "old second");
    const move: typeof rename = async (from, to) => {
      if (to === second)
        throw Object.assign(new CircleConfigError("locked destination"), { code: "EPERM" });
      await rename(from, to);
    };
    await expect(
      writeOutputs(
        [
          { file: first, contents: "new" },
          { file: second, contents: "new" },
        ],
        move,
      ),
    ).rejects.toThrow("prior outputs restored");
    expect(await readFile(first, "utf8")).toBe("old first");
    expect(await readFile(second, "utf8")).toBe("old second");
    expect((await readdir(root)).filter((name) => name.includes(".tmp-"))).toEqual([]);
  });

  it("removes newly created outputs on rollback and cleans files after a staging failure", async () => {
    const root = await fixture();
    const first = path.join(root, "new-output");
    const blocked = path.join(root, "blocker");
    await writeFile(blocked, "file");
    await expect(
      writeOutputs([
        { file: first, contents: "new" },
        { file: path.join(blocked, "child"), contents: "new" },
      ]),
    ).rejects.toThrow("prior outputs restored");
    expect(
      (await readdir(root)).filter((name) => name.includes(".tmp-") || name === "new-output"),
    ).toEqual([]);
    await expect(
      writeOutputs(
        [
          { file: first, contents: "new" },
          { file: path.join(root, "second"), contents: "new" },
        ],
        async (from, to) => {
          if (to !== first) throw new CircleConfigError("injected failure");
          await rename(from, to);
        },
      ),
    ).rejects.toThrow("prior outputs restored");
    expect(
      (await readdir(root)).filter((name) => name.includes(".tmp-") || name === "new-output"),
    ).toEqual([]);
  });
});
