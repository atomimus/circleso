import assert from "node:assert/strict";
import { describe, expect, it } from "vitest";
import { allowLiveRequest, liveConfig } from "./integration-policy";

const env = {
  CIRCLE_LIVE_TESTS: "read-only",
  CIRCLE_TEST_COMMUNITY_ACK: "dedicated-test-community",
  CIRCLE_TEST_BASE_URL: "https://dedicated.example.test",
  CIRCLE_TEST_MEMBER_TOKEN: "synthetic",
  CIRCLE_TEST_MEMBER_ID: "2",
  CIRCLE_TEST_COMMUNITY_ID: "3",
  CIRCLE_TEST_SPACE_ID: "4",
};
describe("live integration scope", () => {
  it("does not discover or use ambient credentials without explicit activation", () => {
    expect(
      liveConfig({
        CIRCLE_ADMIN_TOKEN: "synthetic",
        CIRCLE_HEADLESS_TOKEN: "synthetic",
        CIRCLE_LIVE_WRITES: "bookmark",
      }),
    ).toBeUndefined();
    for (const key of Object.keys(env).filter((key) => key !== "CIRCLE_LIVE_TESTS"))
      expect(() => liveConfig({ ...env, [key]: "" })).toThrow();
  });
  it.each([
    "http://dedicated.example.test",
    "https://app.circle.so",
    "https://user:pass@dedicated.example.test",
    "https://dedicated.example.test/path",
    "https://dedicated.example.test?x=1",
  ])("rejects unsafe test origin %s", (origin) => {
    expect(() => liveConfig({ ...env, CIRCLE_TEST_BASE_URL: origin })).toThrow();
  });
  it("permits only fixed identity/space reads by default, with no redirects or other origins", () => {
    const config = liveConfig(env);
    assert.ok(config);
    const permit = (pathname: string, method = "GET") =>
      allowLiveRequest(config, new Request(`${config.baseUrl}${pathname}`, { method }));
    expect(permit("/api/headless/v1/community_member")).toBe(true);
    expect(permit("/api/headless/v1/spaces/4")).toBe(true);
    for (const path of [
      "/api/headless/v1/spaces/5",
      "/api/headless/v1/community_member?x=1",
      "/api/headless/v1/bookmarks",
      "/api/admin/v2/community_member_charges/1/refund",
    ])
      expect(permit(path)).toBe(false);
    expect(permit("/api/headless/v1/community_member", "DELETE")).toBe(false);
    expect(
      allowLiveRequest(config, new Request("https://other.example.test/api/headless/v1/spaces/4")),
    ).toBe(false);
  });
  it("requires independent write/account flags and restricts cleanup to the owned ID", () => {
    expect(() => liveConfig({ ...env, CIRCLE_LIVE_WRITES: "bookmark" })).toThrow();
    const config = liveConfig({
      ...env,
      CIRCLE_LIVE_WRITES: "bookmark",
      CIRCLE_DISPOSABLE_ACCOUNT_ACK: "authorized-disposable-account",
      CIRCLE_TEST_POST_ID: "6",
    });
    assert.ok(config);
    const request = (path: string, method: string) =>
      new Request(`${config.baseUrl}/api/headless/v1/${path}`, { method });
    expect(allowLiveRequest(config, request("bookmarks", "POST"))).toBe(true);
    expect(allowLiveRequest(config, request("bookmarks/7", "DELETE"))).toBe(false);
    expect(allowLiveRequest(config, request("bookmarks/7", "DELETE"), 7)).toBe(true);
    expect(allowLiveRequest(config, request("bookmarks/8", "DELETE"), 7)).toBe(false);
    expect(allowLiveRequest(config, request("spaces/4/posts/6", "DELETE"), 7)).toBe(false);
    expect(allowLiveRequest(config, request("messages", "POST"), 7)).toBe(false);
  });
});
