import { readFile } from "node:fs/promises";
import { parseYaml } from "@redocly/openapi-core";
import { describe, expect, it } from "vitest";
import { CircleConfigError } from "../src/core/errors";
import { requestContracts as admin } from "../src/generated/admin-v2.requests";
import { requestContracts as auth } from "../src/generated/headless-auth-v1.requests";
import { requestContracts as headless } from "../src/generated/headless-client-v1.requests";
import { renderRequestContracts } from "./request-contracts";
import { normalizeRequestTypes } from "./request-type-normalization";
import { fixtureSource, fixtureSpec } from "./spec-fixtures";
import { type JsonObject, loadSpecs, parseSpec, renderTypes, specFile } from "./spec-tools";

describe("generated request contracts", () => {
  it("covers every operation in every accepted spec without network", async () => {
    const generated = { adminApi: admin, headlessApi: headless, authApi: auth };
    for (const spec of await loadSpecs(process.cwd())) {
      const source = await readFile(specFile(spec), "utf8");
      const contracts = generated[spec.module as keyof typeof generated];
      const paths = parseSpec(source, spec).paths as Record<string, JsonObject>;
      const expected = Object.entries(paths).flatMap(([path, item]) =>
        ["get", "post", "put", "patch", "delete"]
          .filter((method) => item[method])
          .map((method) => `${method} ${path}`),
      );
      expect(Object.keys(contracts).sort()).toEqual(expected.sort());
      expect(renderRequestContracts(parseSpec(source, spec))).toBe(
        await readFile(`src/generated/${spec.name}.requests.ts`, "utf8"),
      );
    }
  });

  it("resolves parameter/body/schema refs and inventories a mixed POST without guessing from its verb", () => {
    const doc = {
      paths: {
        "/fixture": {
          parameters: [{ $ref: "#/components/parameters/Filter" }],
          post: {
            parameters: [{ name: "shared", in: "query" }],
            requestBody: { $ref: "#/components/requestBodies/Body" },
          },
        },
      },
      components: {
        parameters: { Filter: { name: "filter", in: "query", required: true } },
        requestBodies: {
          Body: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Body" } } },
          },
        },
        schemas: {
          Body: {
            type: "object",
            properties: { title: { type: "string" }, shared: { type: "number" } },
          },
        },
      },
    };
    expect(renderRequestContracts(doc)).toContain('"query": [\n      "filter",\n      "shared"');
    expect(renderRequestContracts(doc)).toContain('"body": [\n      "title",\n      "shared"');
    expect(renderRequestContracts(doc)).toContain('"bodyRequired": true');
    expect(renderRequestContracts(doc)).toBe(renderRequestContracts(doc));
  });

  it("fails unsupported body forms and cyclic refs visibly during generation", () => {
    for (const doc of [
      {
        paths: {
          "/fixture": {
            post: {
              requestBody: { content: { "application/json": { schema: { type: "array" } } } },
            },
          },
        },
      },
      {
        paths: { "/fixture": { post: { requestBody: { $ref: "#/components/a" } } } },
        components: { a: { $ref: "#/components/b" }, b: { $ref: "#/components/a" } },
      },
    ])
      expect(() => renderRequestContracts(doc)).toThrow(CircleConfigError);
  });
});

describe("required-only oneOf normalization", () => {
  const source = fixtureSource.replace(
    "    get:",
    `    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                email: {type: string}
                member_id: {type: integer}
              oneOf:
                - required: [email]
                - required: [member_id]`,
  );

  it("generates required alternatives from inherited property definitions without modifying input bytes", async () => {
    const normalized = normalizeRequestTypes(source);
    const output = await renderTypes(source, fixtureSpec);
    expect(output).toContain("email: string");
    expect(output).toContain("member_id: number");
    expect(output).not.toContain("unknown | unknown");
    expect(normalizeRequestTypes(normalized)).toBe(normalized);
    const original: unknown = parseYaml(source);
    expect(original).not.toEqual(parseYaml(normalized));
    expect(source).not.toContain('"properties"');
  });

  it("leaves responses, official typed branches and unsupported alternatives unchanged", () => {
    expect(normalizeRequestTypes(fixtureSource)).toBe(fixtureSource);
    for (const alternative of [
      "properties: {email: {type: string}}",
      "required: [unknown_field]",
      "$ref: '#/components/schemas/Identity'",
    ]) {
      const modified = source
        .replace("required: [email]", alternative)
        .replace("- required: [member_id]", `- ${alternative}`);
      expect(normalizeRequestTypes(modified)).toBe(modified);
    }
  });
});
