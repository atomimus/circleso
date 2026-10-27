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
  "paginateSearchAfter",
  "toAsyncIterator",
  "richText",
  "createSessionCookiesUrl",
];
assert.deepEqual(Object.keys(esm[0]).sort(), [...errors, ...helpers].sort());
assert.deepEqual(Object.keys(cjs[0]).sort(), [...errors, ...helpers].sort());
for (const modules of [esm, cjs]) {
  for (const [index, names] of [
    [],
    ["createAdmin", "createAdminClient", "richText"],
    ["createHeadless", "createHeadlessClient", "richText", "createSessionCookiesUrl"],
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
  } else if (request.url.endsWith("/cookies")) {
    assert.equal(request.headers.authorization, "Bearer fixture-member");
    assert.ok(["POST", "DELETE"].includes(request.method));
    response.setHeader("Content-Type", "application/json");
    response.setHeader("X-Request-Id", "synthetic-request");
    response.setHeader("Set-Cookie", [
      "synthetic_session=value; Path=/; Secure; HttpOnly",
      "synthetic_other=value; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Secure",
    ]);
    response.end(JSON.stringify({ message: "synthetic-cookies" }));
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
  for (const mod of [esm[0], esm[2], cjs[0], cjs[2]]) {
    const member = mod.createHeadless({ accessToken: "fixture-member", baseUrl });
    for (const method of ["createWithResponse", "deleteWithResponse"]) {
      const result = await member.cookies[method]({ credentials: "include" });
      assert.deepEqual(result.data, { message: "synthetic-cookies" });
      assert.equal(result.response.status, 200);
      assert.equal(result.response.headers.get("x-request-id"), "synthetic-request");
      assert.deepEqual(result.response.headers.getSetCookie(), [
        "synthetic_session=value; Path=/; Secure; HttpOnly",
        "synthetic_other=value; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Secure",
      ]);
    }
    const url = new URL(
      mod.createSessionCookiesUrl({
        communityUrl: "https://community.example.test",
        accessToken: "synthetic+&?",
      }),
    );
    assert.equal(url.pathname, "/session/cookies");
    assert.equal(url.searchParams.get("access_token"), "synthetic+&?");
    assert.throws(
      () =>
        mod.createSessionCookiesUrl({
          communityUrl: "http://example.test",
          accessToken: "synthetic",
        }),
      esm[0].CircleConfigError,
    );
  }
  assert.equal(requests, 20);
  console.log(
    "Package auth/cookies: root/Headless ESM/CJS redirect and metadata; 8 additional native cookie calls pass",
  );
} finally {
  server.closeAllConnections();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}

async function collect(iterable) {
  const records = [];
  for await (const row of iterable) records.push(row);
  return records;
}
for (const modules of [esm, cjs]) {
  let n = 0;
  const admin = modules[1].createAdmin({
    token: "synthetic",
    fetcher: async (request) => {
      assert.equal(new URL(request.url).searchParams.get("page"), String(++n));
      return Response.json({ records: [{ id: n }], has_next_page: true });
    },
  });
  assert.deepEqual(await collect(admin.iter.posts({ maxItems: 2 })), [{ id: 1 }, { id: 2 }]);
  assert.equal(n, 2);
  await assert.rejects(collect(admin.iter.posts({ per_page: 101 })), esm[0].CircleConfigError);
  let cursorCalls = 0;
  const member = modules[2].createHeadless({
    token: "synthetic",
    fetcher: async (request) => {
      const url = new URL(request.url);
      assert.deepEqual(url.searchParams.getAll("search_after"), cursorCalls ? ["001", "2"] : []);
      cursorCalls++;
      return Response.json({
        records: [{ id: cursorCalls }],
        next_search_after: cursorCalls === 1 ? ["001", 2] : null,
      });
    },
  });
  assert.deepEqual(await collect(member.iter.communityMembers({ maxPages: 2 })), [
    { id: 1 },
    { id: 2 },
  ]);
  assert.equal(member.iter, member.raw.iter);
  const pages = modules[0].paginateSearchAfter({
    maxItems: 0,
    fetchPage: async () => {
      throw new Error("zero budget must not fetch");
    },
  });
  assert.deepEqual(await collect(pages), []);
}
console.log(
  "Package pagination: ESM/CJS typed resource iterators, cursor tuples, zero/exact caps, shared config errors pass",
);

for (const modules of [esm, cjs]) {
  for (const entry of [0, 1, 2]) {
    for (const surface of entry === 0
      ? ["createAdmin", "createHeadless"]
      : [entry === 1 ? "createAdmin" : "createHeadless"]) {
      const client = modules[entry][surface]({
        token: "synthetic",
        fetcher: async (request) => {
          const body = await request.json();
          assert.equal(body.blob.checksum, "kAFQmDzST7DWlj99KOF/cg==");
          assert.equal(body.blob.byte_size, 3);
          return Response.json({
            signed_id: "synthetic-id",
            attachable_sgid: "synthetic-sgid",
            direct_upload: {
              url: "https://storage.example/synthetic?signature=synthetic",
              headers: { "Content-Type": "text/plain" },
            },
          });
        },
      });
      let calls = 0;
      const result = await client.directUploads.upload(Buffer.from("abc"), {
        key: "",
        filename: "synthetic.txt",
        storageFetcher: async (request) => {
          calls++;
          assert.equal(request.headers.get("authorization"), null);
          assert.equal(request.headers.get("cookie"), null);
          assert.equal(request.headers.get("host"), null);
          assert.equal(request.credentials, "omit");
          assert.equal(request.redirect, "error");
          assert.equal(request.referrerPolicy, "no-referrer");
          assert.equal(await request.text(), "abc");
          return new Response(null, { status: 204 });
        },
      });
      assert.deepEqual(result, { signed_id: "synthetic-id", attachable_sgid: "synthetic-sgid" });
      assert.equal(calls, 1);
    }
  }
}
console.log(
  "Package uploads: root/Admin/Member ESM/CJS end-to-end, bundled MD5 and storage isolation pass",
);

for (const modules of [esm, cjs]) {
  for (const index of [0, 1, 2]) {
    const { richText, CircleConfigError } = modules[index];
    const content = richText.body(
      [
        richText.paragraph(
          richText.text("Hello "),
          richText.mention("synthetic-sgid"),
          richText.hardBreak(),
          richText.link("Guide", "https://example.com"),
        ),
      ],
      { attachments: [richText.signedAttachment("synthetic-id")] },
    );
    assert.equal(content.body.content[0].content[3].marks[0].attrs.target, "_blank");
    assert.throws(() => richText.mention("bad id"), CircleConfigError);
    assert.throws(() => richText.paragraph({ type: "future" }), CircleConfigError);
    const extension = richText.unchecked({
      body: { type: "doc", content: [{ type: "future", attrs: { value: null } }] },
    });
    let calls = 0;
    const config = {
      token: "synthetic",
      fetcher: async (request) => {
        calls++;
        const body = await request.json();
        assert.deepEqual(body.rich_text_body, calls === 1 ? content : extension);
        return Response.json({});
      },
    };
    if (index === 1) {
      const admin = modules[index].createAdmin(config);
      await admin.messages.create({ chat_room_uuid: "room", rich_text_body: content });
      await admin.chatRoomMessageImports.create({
        chat_room_uuid: "room",
        user_email: "synthetic@example.com",
        sent_at: "2020-01-01T00:00:00Z",
        rich_text_body: extension,
      });
    } else {
      const member = modules[index].createHeadless(config);
      await member.chatRooms.messages.create("room", { rich_text_body: content });
      await member.chatRooms.messages.update("room", "2", { rich_text_body: extension });
    }
    assert.equal(calls, 2);
  }
}
console.log(
  "Package rich text: root/Admin/Member ESM/CJS builders, validation and public writes pass",
);

for (const modules of [esm, cjs]) {
  for (const index of [0, 1, 2, 3]) {
    const mod = modules[index];
    let calls = 0;
    const config = {
      token: "synthetic",
      usage: { maxConcurrent: 1, maxQueueSize: 0 },
      fetcher: async () => {
        calls++;
        return new Response(new ReadableStream());
      },
    };
    const client =
      index === 1
        ? mod.createAdmin(config)
        : index === 3
          ? mod.createAuth(config)
          : mod.createHeadless(config);
    const call = () =>
      index === 3
        ? client.raw.POST("/api/v1/headless/auth_token", {
            body: { email: "synthetic@example.test" },
            parseAs: "stream",
          })
        : client.raw.GET(index === 1 ? "/api/admin/v2/spaces" : "/api/headless/v1/bookmarks", {
            parseAs: "stream",
          });
    const first = await call();
    await assert.rejects(call(), (error) => {
      assert.ok(error instanceof esm[0].CircleNetworkError);
      assert.deepEqual(error.cause, { code: "CIRCLE_QUEUE_FULL" });
      assert.ok(Object.isFrozen(error.cause));
      return true;
    });
    assert.equal(calls, 1);
    await first.data.cancel();
    await (await call()).data.cancel();
    assert.equal(calls, 2);
  }
  let attempts = 0;
  const controlled = modules[0].createSmartFetch({
    baseUrl: "https://example.test",
    retries: { retries: 0 },
    usage: { circuitBreaker: { failureThreshold: 1, cooldownMs: 1000 } },
    fetcher: async () => {
      attempts++;
      return new Response(null, { status: 503 });
    },
  });
  await assert.rejects(controlled("/one"), esm[0].CircleHttpError);
  await assert.rejects(controlled("/two"), (error) => error.cause.code === "CIRCLE_CIRCUIT_OPEN");
  assert.equal(attempts, 1);
}
console.log(
  "Package usage controls: all eight entries/formats bound active bodies/queues; circuits isolate and reject before transport",
);
