import openapiTS, { astToString } from "openapi-typescript";
import { describe, expect, it, vi } from "vitest";
import { applySpecOverrides } from "./spec-overrides";

const source = `openapi: 3.0.0
info:
  title: Admin API V2
  version: v2
paths:
  /api/admin/v2/chat_room_message_imports:
    post:
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                "$ref": "#/components/schemas/admin_v2_chat_room_message"
components:
  schemas: {}
`;

describe("applySpecOverrides", () => {
  it("generates an unknown response for the missing upstream chat import schema", async () => {
    const patched = applySpecOverrides(source);
    const output = astToString(await openapiTS(patched));

    expect(output).toContain('"application/json": unknown');
    expect(applySpecOverrides(patched)).toBe(patched);
  });

  it("uses the official schema when Circle defines it", async () => {
    const fixed = source.replace(
      "  schemas: {}",
      `  schemas:
    admin_v2_chat_room_message:
      type: object
      properties:
        id:
          type: integer`,
    );

    expect(applySpecOverrides(fixed)).toBe(fixed);
    expect(astToString(await openapiTS(fixed))).toContain("id?: number");
  });

  it("keeps unrelated unresolved references as generation errors", async () => {
    const unrelated = source.replaceAll("admin_v2_chat_room_message", "another_missing_schema");

    expect(applySpecOverrides(unrelated)).toBe(unrelated);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await expect(openapiTS(applySpecOverrides(unrelated))).rejects.toThrow("Can't resolve $ref");
    } finally {
      errorLog.mockRestore();
    }
  });
});
