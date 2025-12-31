import { describe, expect, it } from "vitest";
import { joinPath, joinUrl, withQuery } from "./url";

describe("url helpers", () => {
  it("joins path segments with a single slash", () => {
    expect(joinPath("/v1/", "/admin", "users/")).toBe("/v1/admin/users");
  });

  it("joins base url and paths", () => {
    expect(joinUrl("https://api.example.com/v1", "/admin", "users")).toBe(
      "https://api.example.com/v1/admin/users",
    );
  });

  it("adds query parameters", () => {
    const url = withQuery("https://api.example.com/v1/users", { active: true, page: 2 });
    expect(url).toBe("https://api.example.com/v1/users?active=true&page=2");
  });
});
