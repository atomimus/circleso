import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { createHeadless } from "circleso/headless";

// Installed package, synthetic fetch boundary; no network or customer data.
// Timings and process memory are observations, never flaky CI thresholds or an SLA.
const measurements = [];
async function measure(name, operation) {
  globalThis.gc?.();
  const before = process.memoryUsage();
  const started = performance.now();
  const counts = await operation();
  const elapsedMs = performance.now() - started;
  globalThis.gc?.();
  const after = process.memoryUsage();
  measurements.push({
    name,
    elapsedMs: Math.round(elapsedMs * 100) / 100,
    retainedHeapDeltaBytes: after.heapUsed - before.heapUsed,
    rssBytes: after.rss,
    ...counts,
  });
}

await measure("1000 sequential parsed reads", async () => {
  let calls = 0;
  const member = createHeadless({
    accessToken: "synthetic",
    timeoutMs: 1000,
    retries: { retries: 0 },
    fetcher: async () => {
      calls++;
      return Response.json({ records: [{ id: 1 }], has_next_page: false });
    },
  });
  for (let i = 0; i < 1000; i++) assert.equal((await member.bookmarks.list()).records[0].id, 1);
  assert.equal(calls, 1000);
  return { calls };
});

await measure("bounded lazy pagination", async () => {
  let calls = 0;
  const member = createHeadless({
    accessToken: "synthetic",
    fetcher: async () => {
      calls++;
      return Response.json({
        records: Array.from({ length: 100 }, (_, id) => ({ id })),
        has_next_page: true,
      });
    },
  });
  const iterator = member.iter.bookmarks({ per_page: 100, maxPages: 10, maxItems: 450 });
  assert.equal(calls, 0);
  let items = 0;
  for await (const _item of iterator) items++;
  assert.equal(items, 450);
  assert.equal(calls, 5);
  return { calls, items };
});

await measure("50 concurrent reads with single refresh", async () => {
  let refreshes = 0;
  let attempts = 0;
  const member = createHeadless({
    accessToken: "synthetic-old",
    refreshToken: "synthetic-refresh",
    authToken: "synthetic-application",
    autoRefresh: true,
    timeoutMs: 5000,
    usage: { maxConcurrent: 4, maxQueueSize: 100 },
    fetcher: async (request) => {
      if (new URL(request.url).pathname.endsWith("/access_token/refresh")) {
        refreshes++;
        return Response.json({ access_token: "synthetic-new" });
      }
      attempts++;
      return request.headers.get("authorization") === "Bearer synthetic-new"
        ? Response.json({ records: [] })
        : Response.json({}, { status: 401 });
    },
  });
  await Promise.all(Array.from({ length: 50 }, () => member.bookmarks.list()));
  assert.equal(refreshes, 1);
  assert.ok(attempts >= 51 && attempts <= 100);
  return { attempts, refreshes };
});

for (const bytes of [1024 * 1024, 16 * 1024 * 1024]) {
  await measure(`upload preparation ${bytes} bytes`, async () => {
    let registrationCalls = 0;
    let storageCalls = 0;
    const member = createHeadless({
      accessToken: "synthetic",
      fetcher: async (request) => {
        registrationCalls++;
        const { blob } = await request.json();
        assert.equal(blob.byte_size, bytes);
        assert.match(blob.checksum, /^[A-Za-z0-9+/]{22}==$/);
        return Response.json({
          signed_id: "synthetic-id",
          attachable_sgid: "synthetic-sgid",
          direct_upload: {
            url: "https://storage.example.test/file",
            headers: { "Content-Type": "application/octet-stream" },
          },
        });
      },
    });
    await member.directUploads.upload(new Uint8Array(bytes), {
      key: "",
      filename: "synthetic.bin",
      storageFetcher: async (request) => {
        storageCalls++;
        assert.equal(request.credentials, "omit");
        assert.equal(request.redirect, "error");
        assert.equal(request.headers.get("authorization"), null);
        // Drain in chunks; measuring preparation does not require another full copy.
        let received = 0;
        for await (const chunk of request.body) received += chunk.byteLength;
        assert.equal(received, bytes);
        return new Response(null, { status: 204 });
      },
    });
    assert.equal(registrationCalls, 1);
    assert.equal(storageCalls, 1);
    return { bytes, registrationCalls, storageCalls };
  });
}

console.log(
  `Package workflow measurements: ${JSON.stringify({ node: process.version, platform: process.platform, maxRssKiB: process.resourceUsage().maxRSS, measurements })}`,
);
