import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { CircleConfigError } from "../src/core/errors";
import { inventory, rawOperations, report, wrappers } from "./coverage-tools";

const index = `import { createItemsResource } from "./resources/items";
export function createApi() { return { items: createItemsResource(request) }; }`;
const resource = `export function createItemsResource(request) {
  // request.delete("/comment-only");
  return { nested: { list: () => request.get("/items"), create: () => request.post("/items") } };
}
function unused(request) { return request.delete("/dead-code"); }`;

describe("operation inventory", () => {
  it("counts generated method/path pairs and excludes optional never methods", () => {
    expect([
      ...rawOperations(`export interface paths {
      "/items": { parameters: { query?: never }; get: { responses: {} }; post: operations["create"]; delete?: never };
    }`),
    ]).toEqual(["GET /items", "POST /items"]);
    expect(() => rawOperations("export interface noPaths {};")).toThrow(CircleConfigError);
  });

  it("traces registered nested facade names and ignores dead code and comments", async () => {
    const load = vi.fn(async () => resource);
    expect(await wrappers(index, load)).toEqual([
      { method: "GET", path: "/items", name: "items.nested.list", file: "resources/items.ts" },
      { method: "POST", path: "/items", name: "items.nested.create", file: "resources/items.ts" },
    ]);
    expect(load).toHaveBeenCalledWith("./resources/items.ts");
  });

  it("fails visibly on unregistered resources or dynamic requester paths", async () => {
    await expect(
      wrappers(
        index.replace("items: createItemsResource(request)", "raw: client"),
        async () => resource,
      ),
    ).rejects.toThrow("Unregistered");
    await expect(
      wrappers(index, async () =>
        resource.replace('request.get("/items")', "request.get(dynamicPath)"),
      ),
    ).rejects.toThrow("Dynamic request");
  });

  it("reproduces the committed repository inventory and assigns every accepted gap offline", async () => {
    const root = fileURLToPath(new URL("../", import.meta.url));
    const data = await inventory(root);
    expect(
      data.every(
        (surface) => surface.operations.length > 0 && surface.operations.every((op) => op.raw),
      ),
    ).toBe(true);
    const gaps = data[0]?.operations.filter((op) => !op.wrappers.length) ?? [];
    expect(gaps.filter((op) => op.task === null)).toEqual([]);
    expect(report(data)).toBe(await readFile(path.join(root, "docs/api-coverage.md"), "utf8"));
  });
});
