import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:https";
import { CircleConfigError, CircleNetworkError, createHeadless } from "circleso/headless";
import { pinnedFetch } from "./pinned-fetch.mjs";

// Exercise the exact compiled documentation recipe with native Fetch and real HTTPS.
const tls = {
  key: await readFile(process.env.CIRCLE_FIXTURE_KEY),
  cert: await readFile(process.env.CIRCLE_FIXTURE_CERT),
};
let targetCalls = 0;
let sourceCalls = 0;
const target = createServer(tls, async (request, response) => {
  targetCalls++;
  for await (const _chunk of request) {
    /* drain synthetic data */
  }
  response.end("{}");
});
target.listen(0, "127.0.0.1");
await once(target, "listening");
const targetOrigin = `https://localhost:${target.address().port}`;
const source = createServer(tls, async (request, response) => {
  sourceCalls++;
  for await (const _chunk of request) {
    /* drain synthetic data */
  }
  if (request.url.endsWith("/access_token/refresh")) {
    response.writeHead(307, { location: `${targetOrigin}/must-not-receive-refresh` });
  } else {
    response.writeHead(401, { "content-type": "application/json" });
  }
  response.end("{}");
});
source.listen(0, "127.0.0.1");
await once(source, "listening");
const sourceOrigin = `https://localhost:${source.address().port}`;
try {
  const member = createHeadless({
    baseUrl: sourceOrigin,
    accessToken: "synthetic-expired",
    authToken: "synthetic-application",
    refreshToken: "synthetic-refresh",
    autoRefresh: true,
    timeoutMs: 2000,
    retries: { retries: 0 },
    fetcher: pinnedFetch(sourceOrigin),
  });
  await assert.rejects(member.bookmarks.list(), CircleNetworkError);
  assert.equal(sourceCalls, 2); // original 401 plus exactly one refused refresh redirect
  assert.equal(targetCalls, 0);
  await assert.rejects(
    member.raw.GET("/api/headless/v1/bookmarks", { baseUrl: targetOrigin }),
    CircleConfigError,
  );
  assert.equal(sourceCalls, 2);
  assert.equal(targetCalls, 0);
  assert.throws(() => pinnedFetch("http://example.test"), CircleConfigError);
  let attempts = 0;
  const canceled = new AbortController();
  canceled.abort();
  const transport = pinnedFetch(sourceOrigin, async (request) => {
    attempts++;
    assert.equal(request.redirect, "error");
    assert.equal(request.signal.aborted, true);
    assert.equal(request.credentials, "omit");
    assert.equal(await request.text(), "synthetic-body");
    return new Response(null, { status: 204 });
  });
  await transport(`${sourceOrigin}/synthetic`, {
    method: "POST",
    body: "synthetic-body",
    signal: canceled.signal,
    credentials: "omit",
  });
  assert.equal(attempts, 1);
  console.log(
    "Security recipe: actual compiled docs reject native HTTPS refresh redirects and raw destination overrides; body/signal/credentials preserved",
  );
} finally {
  source.closeAllConnections();
  target.closeAllConnections();
  await Promise.all([
    new Promise((resolve) => source.close(resolve)),
    new Promise((resolve) => target.close(resolve)),
  ]);
}
