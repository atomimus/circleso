import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CircleConfigError,
  type CircleHttpError,
  type CircleNetworkError,
  CircleTimeoutError,
} from "../src/core/errors";
import { checkLiveSpecs, downloadSpec, syncSpecs } from "./spec-download";
import { fixtureSource, fixtureSpec } from "./spec-fixtures";
import { generate } from "./spec-tools";

const roots: string[] = [];
async function fixture(): Promise<string> {
  const root = await mkdtemp(path.join(os.tmpdir(), "circleso-download-"));
  roots.push(root);
  await mkdir(path.join(root, "api/specs"), { recursive: true });
  await writeFile(
    path.join(root, "api/specs/sources.json"),
    JSON.stringify({ specs: [fixtureSpec] }),
  );
  await writeFile(path.join(root, "api/specs/fixture.yaml"), fixtureSource);
  await generate(root);
  return root;
}
const fetchSource = (source: string): typeof fetch =>
  vi.fn(
    async () => new Response(source, { headers: { "content-type": "text/yaml; charset=utf-8" } }),
  );
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("spec downloads", () => {
  it("preserves original response bytes and sends a bounded signal without redirects", async () => {
    const bytes = `---\r\n${fixtureSource}`;
    const fetcher = fetchSource(bytes);
    expect(await downloadSpec(fixtureSpec, fetcher)).toEqual(Buffer.from(bytes));
    expect(fetcher).toHaveBeenCalledWith(
      fixtureSpec.url,
      expect.objectContaining({ signal: expect.any(AbortSignal), redirect: "error" }),
    );
  });

  it("rejects unsuccessful HTTP responses and retains fetch failure causes", async () => {
    await expect(
      downloadSpec(
        fixtureSpec,
        vi.fn(async () => new Response("", { status: 503 })),
      ),
    ).rejects.toMatchObject({
      name: "CircleHttpError",
      status: 503,
      url: fixtureSpec.url,
      method: "GET",
    } satisfies Partial<CircleHttpError>);
    const cause = new TypeError("socket closed");
    await expect(
      downloadSpec(
        fixtureSpec,
        vi.fn(async () => {
          throw cause;
        }),
      ),
    ).rejects.toMatchObject({
      name: "CircleNetworkError",
      cause,
    } satisfies Partial<CircleNetworkError>);
  });

  it("rejects HTML, empty bodies, absent content-type and oversized streaming bodies", async () => {
    for (const response of [
      new Response("<html>proxy error</html>", { headers: { "content-type": "text/html" } }),
      new Response("", { headers: { "content-type": "text/plain" } }),
      new Response(null),
      new Response(new Uint8Array(10 * 1024 * 1024 + 1), {
        headers: { "content-type": "text/plain" },
      }),
    ]) {
      await expect(
        downloadSpec(
          fixtureSpec,
          vi.fn(async () => response),
        ),
      ).rejects.toBeInstanceOf(CircleConfigError);
    }
  });

  it("bounds native fetch before headers and during the response body", async () => {
    const server = createServer((request, response) => {
      if (request.url === "/body") {
        response.writeHead(200, { "content-type": "text/plain" });
        response.write("openapi:");
      }
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new CircleConfigError("Missing test server address");
    try {
      for (const endpoint of ["headers", "body"]) {
        const fetcher: typeof fetch = (_url, init) =>
          fetch(`http://127.0.0.1:${address.port}/${endpoint}`, init);
        await expect(downloadSpec(fixtureSpec, fetcher, 50)).rejects.toBeInstanceOf(
          CircleTimeoutError,
        );
      }
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("preserves all committed inputs if a later download or schema validation fails", async () => {
    const root = await fixture();
    const input = path.join(root, "api/specs/fixture.yaml");
    const other = {
      ...fixtureSpec,
      name: "second",
      url: "https://api-headless.circle.so/second.yaml",
    };
    await writeFile(
      path.join(root, "api/specs/sources.json"),
      JSON.stringify({ specs: [fixtureSpec, other] }),
    );
    for (const bad of [
      "<html>not a spec</html>",
      "openapi: [",
      fixtureSource.replace("Fixture API", "Wrong API"),
    ]) {
      const fetcher: typeof fetch = vi.fn(
        async (url) =>
          new Response(
            url === fixtureSpec.url ? fixtureSource.replace("type: string", "type: number") : bad,
            { headers: { "content-type": "text/plain" } },
          ),
      );
      await expect(syncSpecs(root, fetcher)).rejects.toBeInstanceOf(CircleConfigError);
      expect(await readFile(input, "utf8")).toBe(fixtureSource);
      expect((await readdir(path.dirname(input))).sort()).toEqual(["fixture.yaml", "sources.json"]);
    }
    await syncSpecs(root, fetchSource(fixtureSource));
    expect(await readFile(path.join(root, "api/specs/second.yaml"), "utf8")).toBe(fixtureSource);
  });

  it("keeps a live refresh diff inspectable without changing accepted specs or types", async () => {
    const root = await fixture();
    expect(await checkLiveSpecs(root, fetchSource(fixtureSource))).toBeNull();
    const candidate = fixtureSource.replace("type: string", "type: number");
    const report = await checkLiveSpecs(root, fetchSource(candidate));
    expect(report).toBeTypeOf("string");
    if (!report) throw new CircleConfigError("Expected drift report");
    expect(await readFile(path.join(report, "after/api/specs/fixture.yaml"), "utf8")).toBe(
      candidate,
    );
    expect(await readFile(path.join(report, "fixture.yaml.patch"), "utf8")).toContain(
      "+              schema: {type: number}",
    );
    expect(await readFile(path.join(report, "fixture.d.ts.patch"), "utf8")).toMatch(
      /^\+\s+"application\/json": number;/m,
    );
    expect(await readFile(path.join(root, "api/specs/fixture.yaml"), "utf8")).toBe(fixtureSource);
    await generate(root, true);
  });

  it("saves the spec diff when a candidate introduces a generation error", async () => {
    const root = await fixture();
    const source = fixtureSource.replace("type: string", "$ref: '#/components/schemas/missing'");
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    let report: string | null;
    try {
      report = await checkLiveSpecs(root, fetchSource(source));
    } finally {
      log.mockRestore();
    }
    if (!report) throw new CircleConfigError("Expected invalid candidate report");
    expect(await readFile(path.join(report, "after/api/specs/fixture.yaml"), "utf8")).toBe(source);
    expect(await readFile(path.join(report, "fixture.generation-error.txt"), "utf8")).toContain(
      "Can't resolve $ref",
    );
    expect(await readFile(path.join(root, "api/specs/fixture.yaml"), "utf8")).toBe(fixtureSource);
    await generate(root, true);
  });
});
