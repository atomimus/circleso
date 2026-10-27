import { expect, it } from "vitest";
import { CircleNetworkError, CircleTimeoutError } from "./errors";
import { prepareResponse, readResponseBody } from "./response";

it.each([
  200, 400,
])("retains SDK cancellation identity after browser body error translation, HTTP %s", async (status) => {
  for (const timeout of [false, true]) {
    const original = new DOMException("Synthetic cause", timeout ? "TimeoutError" : "AbortError");
    const expected = timeout
      ? new CircleTimeoutError("Synthetic SDK deadline", 10, original)
      : new CircleNetworkError("Synthetic caller abort", original);
    const controller = new AbortController();
    const response = new Response("", { status });
    Object.defineProperty(response, "text", {
      value: async () => {
        controller.abort(expected);
        throw new TypeError("Browser translated stream failure");
      },
      configurable: true,
    });
    prepareResponse(response, {
      url: "https://example.test/synthetic",
      method: "GET",
      signal: controller.signal,
    });
    await expect(readResponseBody(response)).rejects.toBe(expected);
    expect(expected.cause).toBe(original);
  }
});
