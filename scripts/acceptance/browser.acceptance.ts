import assert from "node:assert/strict";
import {
  type Browser,
  type BrowserContext,
  chromium,
  firefox,
  type Page,
  webkit,
} from "playwright";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { browserFixture } from "./browser-fixture";

const engines = { chromium, firefox, webkit };
const names = (process.env.CIRCLE_TEST_BROWSERS ?? "chromium,firefox,webkit").split(",");
assert.ok(names.length > 0 && new Set(names).size === names.length);
for (const name of names) assert.ok(Object.hasOwn(engines, name), "Unknown browser selector");
const consumer = process.env.CIRCLE_ACCEPTANCE_CONSUMER;
assert.ok(consumer, "Run npm run test:browser to use the actual installed tarball");

describe.each(names)("packaged SDK in %s", (name) => {
  let browser: Browser;
  let fixture: Awaited<ReturnType<typeof browserFixture>>;
  let context: BrowserContext;
  let page: Page;
  beforeAll(async () => {
    fixture = await browserFixture(consumer);
    browser = await engines[name as keyof typeof engines].launch({
      headless: true,
      timeout: 30_000,
    });
    console.log(
      `Real browser: ${name} ${browser.version()}; Node ${process.version}; installed npm artifact`,
    );
  });
  afterAll(async () => {
    await browser?.close();
    await fixture?.close();
  });
  beforeEach(async () => {
    fixture.seen.length = 0;
    context = await browser.newContext({ ignoreHTTPSErrors: true, serviceWorkers: "block" });
    // Native CSP limits traffic to the fixture origins. Request routing would alter CORS.
    page = await context.newPage();
    await page.goto(fixture.appOrigin);
  });
  afterEach(async () => {
    await context?.close();
  });
  const scenario = (method: string, ...args: unknown[]) =>
    page.evaluate(`scenarios.${method}(${args.map((a) => JSON.stringify(a)).join(",")})`);

  it("uses browser bundles, token rotation, bounded pagination and real CORS preflights", async () => {
    expect(await scenario("member", fixture.apiOrigin)).toEqual({ first: 1, ids: [1, 2] });
    const calls = fixture.seen.filter(
      (r) => r.method === "GET" && r.pathname.endsWith("/bookmarks"),
    );
    expect(calls.map((r) => r.headers.authorization)).toEqual([
      "Bearer synthetic-member-a",
      "Bearer synthetic-member-b",
      "Bearer synthetic-member-b",
    ]);
    expect(calls.every((r) => r.headers.host === new URL(fixture.apiOrigin).host)).toBe(true);
    expect(
      fixture.seen.some(
        (r) =>
          r.method === "OPTIONS" &&
          r.headers["access-control-request-headers"]?.includes("authorization"),
      ),
    ).toBe(true);
  });
  it("rejects Admin, application Auth and built-in refresh before browser network", async () => {
    expect(await page.evaluate("guard()")).toEqual({
      rejected: [true, true, true, true],
      calls: 0,
    });
  });
  it.each([
    "classic",
    "module",
  ])("runs Member and rejects server factories in a real %s worker", async (type) => {
    expect(
      await page.evaluate(
        ({ origin, type }) =>
          new Promise((resolve, reject) => {
            const worker = new Worker(type === "classic" ? "/worker.js" : "/module-worker.js", {
              type: type === "classic" ? "classic" : "module",
            });
            const timer = setTimeout(() => {
              worker.terminate();
              reject(new Error("Worker deadline"));
            }, 8000);
            worker.onmessage = (event) => {
              clearTimeout(timer);
              worker.terminate();
              resolve(event.data);
            };
            worker.onerror = () => {
              clearTimeout(timer);
              worker.terminate();
              reject(new Error("Worker execution failed"));
            };
            worker.postMessage(origin);
          }),
        { origin: fixture.apiOrigin, type },
      ),
    ).toEqual({ guard: { rejected: [true, true, true, true], calls: 0 }, first: 1, ids: [1, 2] });
  });
  it("retains HTTP/raw error contracts and fails on a denied CORS response", async () => {
    expect(await scenario("errors", fixture.apiOrigin)).toEqual({
      named: { http: true, status: 401, requestId: "synthetic-401" },
      raw: { ok: false, error: false },
      cors: true,
    });
  });
  it("prevents pre-aborted requests and cancels native requests and stalled response bodies", async () => {
    expect(await scenario("cancel", fixture.apiOrigin, "pre-abort")).toMatchObject({
      network: true,
      timeout: false,
      originalReason: true,
    });
    expect(fixture.seen.some((r) => r.pathname.startsWith("/pre-abort"))).toBe(false);
    expect(await scenario("cancel", fixture.apiOrigin, "slow-headers")).toMatchObject({
      network: true,
      timeout: false,
      originalReason: true,
    });
    const stalled = await scenario("cancel", fixture.apiOrigin, "slow-body");
    expect(stalled, JSON.stringify(stalled)).toMatchObject({
      timeout: true,
      originalReason: false,
    });
    expect(await scenario("cancel", fixture.apiOrigin, "cancel-body")).toMatchObject({
      network: true,
      timeout: false,
      originalReason: true,
    });
  });
  it("sets/deletes same-site cross-origin HttpOnly cookies only with credential opt-in", async () => {
    const defaults = (await scenario("cookies", fixture.apiOrigin)) as {
      stored: boolean;
      nativeDefault: boolean;
    };
    expect(defaults, JSON.stringify(defaults)).toMatchObject({
      stored: defaults.nativeDefault,
      removed: false,
      hidden: true,
      sentCredentials: "same-origin",
    });
    expect(await scenario("cookies", fixture.apiOrigin, "omit")).toMatchObject({
      stored: false,
      hidden: true,
      sentCredentials: "omit",
    });
    expect(await scenario("cookies", fixture.apiOrigin, "include")).toMatchObject({
      hidden: true,
      scriptHidden: true,
      stored: true,
      removed: false,
      message: "Synthetic cookies",
      requestId: "synthetic-cookie",
      sentCredentials: "include",
    });
  });
  it("uploads real File bytes/MD5 over HTTPS without leaking cookies or Circle auth to storage", async () => {
    await context.addCookies([
      {
        name: "synthetic_storage_cookie",
        value: "synthetic",
        url: fixture.apiOrigin,
        secure: true,
      },
    ]);
    const uploaded = await scenario("upload", fixture.apiOrigin);
    expect(uploaded, JSON.stringify(uploaded)).toMatchObject({
      uploaded: { signed_id: "synthetic-id", attachable_sgid: "synthetic-sgid" },
    });
    const registration = fixture.seen.find(
      (r) => r.method === "POST" && r.pathname.endsWith("/direct_uploads"),
    );
    assert.ok(registration);
    expect(JSON.parse(registration.body).blob).toMatchObject({
      filename: "fixture.txt",
      byte_size: 3,
      checksum: "kAFQmDzST7DWlj99KOF/cg==",
    });
    expect(registration.headers.authorization).toBe("Bearer synthetic-upload");
    const upload = fixture.seen.find((r) => r.method === "PUT");
    assert.ok(upload);
    expect(upload.body).toBe("abc");
    expect(upload.headers["content-md5"]).toBe("kAFQmDzST7DWlj99KOF/cg==");
    expect(upload.headers.authorization).toBeUndefined();
    expect(upload.headers.cookie).toBeUndefined();
    expect(upload.headers.referer).toBeUndefined();
    expect(
      fixture.seen.some((r) => r.method === "OPTIONS" && r.pathname.startsWith("/storage/")),
    ).toBe(true);
  });
  it("does not return attachment IDs on storage failure or follow signed redirects", async () => {
    expect(await scenario("upload", fixture.apiOrigin, "fail")).toMatchObject({
      http: true,
      status: 403,
    });
    expect(await scenario("upload", fixture.apiOrigin, "redirect")).toMatchObject({
      network: true,
    });
    expect(fixture.seen.filter((r) => r.method === "PUT")).toHaveLength(2);
    expect(fixture.seen.some((r) => r.pathname === "/redirect-target")).toBe(false);
  });
});
