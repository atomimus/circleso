import { describe, expect, it, vi } from "vitest";
import { createClient } from "./client";
import { HEADER_AUTHORIZATION, HEADER_CONTENT_TYPE } from "./headers";

describe("createClient", () => {
  it("builds urls, headers, and parses JSON", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = input instanceof Request ? input : new Request(input, init);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          [HEADER_CONTENT_TYPE]: "application/json",
        },
      });
    });

    const client = createClient({
      baseUrl: "https://api.example.com",
      auth: { type: "bearer", token: "token" },
      fetcher,
    });

    const data = await client.get<{ ok: boolean }>("/status", {
      headers: { "x-trace-id": "trace" },
    });

    expect(fetcher).toHaveBeenCalledTimes(1);

    const call = fetcher.mock.calls[0];
    if (!call) {
      throw new Error("Expected fetcher to be called.");
    }
    const request = call[0] instanceof Request ? call[0] : new Request(call[0], call[1]);
    expect(request.url).toBe("https://api.example.com/status");

    const headers = request.headers;
    expect(headers.get(HEADER_AUTHORIZATION)).toBe("Bearer token");
    expect(headers.get("x-trace-id")).toBe("trace");

    expect(data.ok).toBe(true);
  });

  it("returns undefined for 204/205 responses", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 205 }));

    const client = createClient({
      baseUrl: "https://api.example.com",
      fetcher,
    });

    const noContent = await client.get("/empty");
    const resetContent = await client.get("/reset");

    expect(noContent).toBeUndefined();
    expect(resetContent).toBeUndefined();
  });
});
