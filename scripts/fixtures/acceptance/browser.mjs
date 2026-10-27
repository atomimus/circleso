import * as sdk from "circleso/headless";

globalThis.scenarios = {
  async member(baseUrl) {
    let token = "synthetic-member-a";
    const member = sdk.createHeadless({
      baseUrl,
      getAccessToken: () => token,
      timeoutMs: 3000,
      retries: { retries: 0 },
      usage: { maxConcurrent: 1 },
    });
    const first = await member.bookmarks.list({ page: 1, per_page: 1 });
    token = "synthetic-member-b";
    const ids = [];
    for await (const bookmark of member.iter.bookmarks({ maxPages: 2, maxItems: 2, per_page: 1 }))
      ids.push(bookmark.id);
    return { first: first.records[0].id, ids };
  },
  async errors(baseUrl) {
    const member = sdk.createHeadless({
      baseUrl: `${baseUrl}/unauthorized`,
      accessToken: "synthetic",
      retries: { retries: 0 },
    });
    let named;
    try {
      await member.bookmarks.list();
    } catch (error) {
      named = {
        http: error instanceof sdk.CircleHttpError,
        status: error.status,
        requestId: error.requestId,
      };
    }
    const raw = await member.raw.GET("/api/headless/v1/bookmarks");
    const blocked = sdk.createHeadless({
      baseUrl: `${baseUrl}/deny-cors`,
      accessToken: "synthetic",
      retries: { retries: 0 },
    });
    let cors;
    try {
      await blocked.bookmarks.list();
    } catch (error) {
      cors = error instanceof sdk.CircleNetworkError;
    }
    return { named, raw: { ok: raw.response.ok, error: raw.error }, cors };
  },
  async cancel(baseUrl, kind) {
    const member = sdk.createHeadless({
      baseUrl: `${baseUrl}/${kind}`,
      accessToken: "synthetic",
      timeoutMs: kind === "slow-body" ? 150 : 3000,
      retries: { retries: 0 },
    });
    const controller = new AbortController();
    const reason = new DOMException("Synthetic caller cancellation", "AbortError");
    if (kind === "pre-abort") controller.abort(reason);
    const pending = member.bookmarks.list({ signal: controller.signal });
    const timer = ["slow-headers", "cancel-body"].includes(kind)
      ? setTimeout(() => controller.abort(reason), 100)
      : undefined;
    try {
      await pending;
      return { failed: false };
    } catch (error) {
      return {
        failed: true,
        network: error instanceof sdk.CircleNetworkError,
        timeout: error instanceof sdk.CircleTimeoutError,
        originalReason: error.cause === reason,
        diagnostic: { message: error.message, cause: error.cause?.message },
      };
    } finally {
      clearTimeout(timer);
    }
  },
  async cookies(baseUrl, credentials) {
    await fetch(`${baseUrl}/api/headless/v1/cookies`, { method: "POST" });
    const nativeDefault = await fetch(`${baseUrl}/cookie-echo`, { credentials: "include" }).then(
      (r) => r.json(),
    );
    await fetch(`${baseUrl}/api/headless/v1/cookies`, { method: "DELETE", credentials: "include" });
    let sentCredentials;
    const member = sdk.createHeadless({
      baseUrl,
      accessToken: "synthetic",
      retries: { retries: 0 },
      fetcher: (request) => {
        sentCredentials = request.credentials;
        return fetch(request);
      },
    });
    const result = await member.cookies.createWithResponse(credentials ? { credentials } : {});
    const creationCredentials = sentCredentials;
    const stored = await fetch(`${baseUrl}/cookie-echo`, { credentials: "include" }).then((r) =>
      r.json(),
    );
    const hidden =
      result.response.headers.get("set-cookie") === null &&
      (result.response.headers.getSetCookie?.() ?? []).length === 0;
    const scriptHidden = !document.cookie.includes("synthetic_session");
    await member.cookies.deleteWithResponse({ credentials: "include" });
    const removed = await fetch(`${baseUrl}/cookie-echo`, { credentials: "include" }).then((r) =>
      r.json(),
    );
    return {
      hidden,
      scriptHidden,
      stored: stored.present,
      nativeDefault: nativeDefault.present,
      removed: removed.present,
      message: result.data.message,
      requestId: result.response.headers.get("x-request-id"),
      sentCredentials: creationCredentials,
    };
  },
  async upload(baseUrl, mode = "ok") {
    const member = sdk.createHeadless({
      baseUrl: `${baseUrl}/${mode}`,
      accessToken: "synthetic-upload",
      retries: { retries: 0 },
      fetcher: (input, init) => fetch(input, init),
    });
    const options = { key: "", timeoutMs: 3000 };
    try {
      const uploaded = await member.directUploads.upload(
        new File(["abc"], "fixture.txt", { type: "text/plain" }),
        options,
      );
      const body = sdk.richText.body([sdk.richText.paragraph(sdk.richText.text("Synthetic"))], {
        attachments: [sdk.richText.signedAttachment(uploaded.signed_id)],
      });
      return { uploaded, attachment: body.attachments[0] };
    } catch (error) {
      return {
        http: error instanceof sdk.CircleHttpError,
        network: error instanceof sdk.CircleNetworkError,
        status: error.status,
        diagnostic: { message: error.message, cause: error.cause?.message },
      };
    }
  },
};
