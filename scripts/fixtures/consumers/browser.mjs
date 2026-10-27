import assert from "node:assert/strict";
import vm from "node:vm";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";

export async function checkBrowser(consumer) {
  for (const entry of ["circleso", "circleso/headless"]) {
    const result = await build({
      stdin: {
        contents: `import {createHeadless, CircleConfigError, richText, createSessionCookiesUrl} from ${JSON.stringify(entry)}; globalThis.probe = {createHeadless, CircleConfigError, richText, createSessionCookiesUrl};`,
        resolveDir: consumer,
        sourcefile: "member-consumer.js",
      },
      bundle: true,
      platform: "browser",
      format: "iife",
      target: "es2022",
      treeShaking: true,
      metafile: true,
      write: false,
      logLevel: "silent",
    });
    const code = result.outputFiles[0].text;
    assert.ok(Buffer.byteLength(code) <= 220 * 1024, "Member browser bundle exceeds 220 KiB");
    assert.ok(gzipSync(code).byteLength <= 45 * 1024, "Member browser bundle exceeds 45 KiB gzip");
    for (const output of Object.values(result.metafile.outputs))
      assert.deepEqual(output.imports, []);
    assert.ok(!/\bBuffer\b|node:/.test(code), "Browser bundle includes a Node dependency");
    assert.ok(
      !/function (?:createAdmin|createAdminClient|createAuth|createHeadlessAuthClient)|\/api\/admin\/v2\//.test(
        code,
      ),
      "Unused server surfaces were not tree shaken",
    );
    // Only web Fetch globals are present; no Node globals or module loader.
    const context = vm.createContext({
      fetch,
      Blob,
      File,
      FormData,
      btoa,
      AbortSignal,
      Request,
      Response,
      Headers,
      AbortController,
      DOMException,
      ReadableStream,
      TextEncoder,
      TextDecoder,
      URL,
      URLSearchParams,
      setTimeout,
      clearTimeout,
    });
    vm.runInContext(code, context, { timeout: 1000 });
    const { createHeadless, CircleConfigError } = context.probe;
    assert.throws(() => createHeadless({ accessToken: "" }), CircleConfigError);
    const member = createHeadless({
      accessToken: "fixture-browser",
      fetcher: async (request) => {
        assert.equal(request.headers.get("authorization"), "Bearer fixture-browser");
        return Response.json({ records: [] });
      },
    });
    // JSON is parsed inside the VM; compare data without cross-realm prototype identity.
    assert.equal(JSON.stringify(await member.bookmarks.list()), '{"records":[]}');
    let usageCalls = 0;
    const controlledMember = createHeadless({
      accessToken: "synthetic",
      usage: { maxConcurrent: 1, maxQueueSize: 0 },
      fetcher: async () => {
        usageCalls++;
        return new Response(new ReadableStream());
      },
    });
    const activeUsage = await controlledMember.raw.GET("/api/headless/v1/bookmarks", {
      parseAs: "stream",
    });
    await assert.rejects(
      controlledMember.bookmarks.list(),
      (error) => error.cause.code === "CIRCLE_QUEUE_FULL",
    );
    assert.equal(usageCalls, 1);
    await activeUsage.data.cancel();
    await (
      await controlledMember.raw.GET("/api/headless/v1/bookmarks", { parseAs: "stream" })
    ).data.cancel();
    assert.equal(usageCalls, 2);
    console.log(
      "Browser VM usage controls: isolated Member queue, overflow and body cancellation pass",
    );
    const cookieMember = createHeadless({
      accessToken: "synthetic-member",
      fetcher: async (request) => {
        assert.equal(request.credentials, "include");
        assert.equal(request.headers.get("authorization"), "Bearer synthetic-member");
        // Emulates a filtered browser response; does not test real cookie storage/CORS.
        return Response.json({ message: "synthetic-cookies" });
      },
    });
    const cookieResult = await cookieMember.cookies.createWithResponse({ credentials: "include" });
    assert.equal(cookieResult.data.message, "synthetic-cookies");
    assert.equal(cookieResult.response.status, 200);
    assert.deepEqual(cookieResult.response.headers.getSetCookie(), []);
    assert.equal(
      new URL(
        context.probe.createSessionCookiesUrl({
          communityUrl: "https://community.example.test",
          accessToken: "synthetic+&?",
        }),
      ).searchParams.get("access_token"),
      "synthetic+&?",
    );
    console.log(
      "Browser VM auth/cookies: member credentials, filtered metadata and redirect URL pass",
    );
    const textBody = vm.runInContext(
      'probe.richText.body([probe.richText.paragraph(probe.richText.text("Hello"), probe.richText.mention("synthetic-sgid"), probe.richText.hardBreak(), probe.richText.link("Guide", "https://example.com"))], {attachments: [probe.richText.signedAttachment("synthetic-id")]})',
      context,
    );
    assert.throws(
      () => context.probe.richText.link("Link", "javascript:alert(1)"),
      CircleConfigError,
    );
    const richTextMember = createHeadless({
      accessToken: "synthetic",
      fetcher: async (request) => {
        const body = await request.json();
        assert.equal(JSON.stringify(body.rich_text_body), JSON.stringify(textBody));
        return Response.json({});
      },
    });
    await richTextMember.chatRooms.messages.update("room", "2", { rich_text_body: textBody });
    console.log("Browser VM rich text: common builders and Member update JSON pass");
    let circleCalls = 0;
    let storageCalls = 0;
    const uploads = createHeadless({
      token: "synthetic",
      fetcher: async (request) => {
        circleCalls++;
        const { blob } = await request.json();
        assert.equal(blob.checksum, "kAFQmDzST7DWlj99KOF/cg==");
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
    const uploaded = await uploads.directUploads.upload(new File(["abc"], "synthetic.txt"), {
      key: "",
      storageFetcher: async (request) => {
        storageCalls++;
        assert.equal(request.headers.get("authorization"), null);
        assert.equal(request.credentials, "omit");
        assert.equal(request.redirect, "error");
        assert.equal(request.referrerPolicy, "no-referrer");
        assert.equal(await request.text(), "abc");
        return new Response(null, { status: 204 });
      },
    });
    assert.equal(
      JSON.stringify(uploaded),
      '{"signed_id":"synthetic-id","attachable_sgid":"synthetic-sgid"}',
    );
    assert.equal(circleCalls, 1);
    assert.equal(storageCalls, 1);
    console.log("Browser VM uploads: File checksum/registration/isolated storage pass");
    console.log(
      `Browser bundle: ${entry}; no Node imports/globals; unused Admin/Auth removed; Member call passes (${code.length} bytes)`,
    );
  }
}

if (process.argv[2]) await checkBrowser(process.argv[2]);
