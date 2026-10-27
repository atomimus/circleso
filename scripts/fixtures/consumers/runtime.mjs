import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const paths = ["circleso", "circleso/admin", "circleso/headless", "circleso/auth"];
const esm = await Promise.all(paths.map((name) => import(name)));
const cjs = paths.map((name) => require(name));
const errors = [
  "CircleSdkError",
  "CircleConfigError",
  "CircleHttpError",
  "CircleNetworkError",
  "CircleTimeoutError",
];
const helpers = [
  "CircleSo",
  "createAdmin",
  "createAdminClient",
  "createHeadless",
  "createHeadlessClient",
  "createAuth",
  "createHeadlessAuthClient",
  "createClient",
  "createSmartFetch",
  "createAdminAuthMiddleware",
  "createBearerAuthMiddleware",
  "createHostHeaderMiddleware",
  "createLoggerMiddleware",
  "joinPath",
  "joinUrl",
  "withQuery",
  "paginateOffset",
  "paginateByIdWindow",
  "toAsyncIterator",
];
assert.deepEqual(Object.keys(esm[0]).sort(), [...errors, ...helpers].sort());
assert.deepEqual(Object.keys(cjs[0]).sort(), [...errors, ...helpers].sort());
for (const modules of [esm, cjs]) {
  for (const [index, names] of [
    [],
    ["createAdmin", "createAdminClient"],
    ["createHeadless", "createHeadlessClient"],
    ["createAuth", "createHeadlessAuthClient"],
  ].entries()) {
    if (index) assert.deepEqual(Object.keys(modules[index]).sort(), [...errors, ...names].sort());
  }
}
for (const mod of [...esm, ...cjs]) {
  for (const name of errors)
    assert.equal(
      mod[name],
      esm[0][name],
      `${name} identity across all eight entry/format combinations`,
    );
}
for (const mod of [esm[0], esm[2], cjs[0], cjs[2]]) {
  assert.throws(
    () => mod.createHeadless({ accessToken: "" }),
    (error) => {
      assert.ok(error instanceof esm[0].CircleConfigError);
      assert.ok(error instanceof cjs[1].CircleSdkError);
      assert.match(error.stack, /src[\\/]core[\\/](?:config|errors)\.ts/);
      return true;
    },
  );
}
for (const name of ["circleso/dist/index.js", "circleso/package.json", "circleso/src/index.ts"]) {
  assert.throws(() => require(name), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
}

let requests = 0;
const server = createServer((request, response) => {
  requests++;
  if (request.url.endsWith("bookmarks")) {
    assert.equal(request.headers.authorization, "Bearer fixture-member");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ records: [] }));
  } else if (request.url.endsWith("auth_token")) {
    assert.equal(request.headers.authorization, "Bearer fixture-application");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ access_token: "fixture-result" }));
  } else if (request.url.endsWith("access_groups")) {
    assert.equal(request.headers.authorization, "Token fixture-admin");
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ records: [] }));
  } else if (request.url === "/error") {
    response.writeHead(400, { "Content-Type": "application/json" });
    response.end('{"message":"fixture"}');
  } else if (request.url === "/empty") {
    response.writeHead(204);
    response.end();
  } else if (request.url === "/slow") {
    // Leave headers pending so the SDK deadline must abort the real native Fetch.
  } else {
    response.writeHead(404);
    response.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
try {
  for (const modules of [esm, cjs]) {
    const member = modules[2].createHeadless({ accessToken: "fixture-member", baseUrl });
    assert.deepEqual(await member.bookmarks.list(), { records: [] });
    const auth = modules[3].createAuth({ token: "fixture-application", baseUrl });
    assert.deepEqual(await auth.authToken.create({ email: "fixture@example.test" }), {
      access_token: "fixture-result",
    });
    const admin = modules[1].createAdmin({
      token: "fixture-admin",
      baseUrl,
      communityHost: `127.0.0.1:${server.address().port}`,
    });
    assert.deepEqual(await admin.accessGroups.list(), { records: [] });
    const smartFetch = modules[0].createSmartFetch({ baseUrl, retries: { retries: 0 } });
    await assert.rejects(smartFetch("/error"), (error) => {
      assert.ok(error instanceof cjs[3].CircleHttpError);
      assert.equal(error.status, 400);
      return true;
    });
    const empty = await smartFetch("/empty");
    assert.equal(empty.status, 204);
    assert.equal(await empty.text(), "");
    await assert.rejects(
      modules[0].createSmartFetch({ baseUrl, timeoutMs: 30, retries: { retries: 0 } })("/slow"),
      cjs[0].CircleTimeoutError,
    );
    const cause = new Error("synthetic transport failure");
    await assert.rejects(
      modules[2]
        .createHeadless({
          accessToken: "fixture-member",
          retries: { retries: 0 },
          fetcher: async () => {
            throw cause;
          },
        })
        .bookmarks.list(),
      (error) => {
        assert.ok(error instanceof esm[1].CircleNetworkError);
        assert.equal(error.cause, cause);
        return true;
      },
    );
  }
  assert.equal(requests, 12);
  console.log(
    "Package runtime: all 8 entries; shared errors; 12 native loopback requests; source maps pass",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
