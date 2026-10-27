// Runnable, synthetic-only fixture: npx tsx examples/auth-and-cookies.ts
// No environment credentials, Circle network calls or persistent token storage.
import assert from "node:assert/strict";
import { createAuth } from "circleso/auth";
import { createHeadless, createSessionCookiesUrl } from "circleso/headless";

const applicationToken = "synthetic-application";
const auth = createAuth({
  token: applicationToken,
  fetcher: async (input) => {
    const request = input as Request;
    assert.equal(request.headers.get("authorization"), `Bearer ${applicationToken}`);
    const body = (await request.json()) as Record<string, unknown>;
    if (request.url.endsWith("/auth_token")) {
      assert.ok(body.email || body.community_member_id || body.sso_user_id);
      return Response.json({
        access_token: "synthetic-access",
        refresh_token: "synthetic-refresh",
        access_token_expires_at: "2030-01-01T01:00:00Z",
        refresh_token_expires_at: "2030-02-01T00:00:00Z",
      });
    }
    if (request.url.endsWith("/refresh")) {
      assert.equal(request.method, "PATCH");
      assert.equal(body.refresh_token, "synthetic-refresh");
      return Response.json({ access_token: "synthetic-renewed" });
    }
    assert.ok(request.url.endsWith("/revoke"));
    assert.ok(body.access_token || body.refresh_token);
    return new Response(null, { status: 204 });
  },
});

for (const identity of [
  { email: "synthetic@example.test" },
  { community_member_id: 42 },
  { sso_user_id: "synthetic-sso" },
]) {
  const tokens = await auth.authToken.create(identity);
  assert.ok(tokens?.access_token && tokens.refresh_token);
  let accessToken = tokens.access_token;
  const member = createHeadless({
    baseUrl: "https://community.example.test",
    getAccessToken: () => accessToken,
    fetcher: async (input) => {
      const request = input as Request;
      assert.equal(request.headers.get("authorization"), `Bearer ${accessToken}`);
      if (request.url.endsWith("/bookmarks")) return Response.json({ records: [] });
      assert.ok(request.url.endsWith("/cookies"));
      const headers = new Headers();
      headers.append("set-cookie", "synthetic_session=value; Path=/; Secure; HttpOnly");
      headers.append(
        "set-cookie",
        "synthetic_other=value; Expires=Wed, 21 Oct 2037 07:28:00 GMT; Secure",
      );
      return Response.json({ message: "synthetic" }, { headers });
    },
  });
  assert.deepEqual(await member.bookmarks.list(), { records: [] });
  const refreshed = await auth.accessToken.refresh({ refresh_token: tokens.refresh_token });
  assert.ok(refreshed?.access_token);
  accessToken = refreshed.access_token;
  const created = await member.cookies.createWithResponse({ credentials: "omit" });
  const forwarded = new Headers({ "cache-control": "no-store" });
  for (const cookie of created.response.headers.getSetCookie())
    forwarded.append("set-cookie", cookie);
  assert.equal(forwarded.getSetCookie().length, 2);
  const url = new URL(
    createSessionCookiesUrl({ communityUrl: "https://community.example.test", accessToken }),
  );
  assert.equal(url.pathname, "/session/cookies");
  assert.equal(url.searchParams.get("access_token"), accessToken);
  assert.equal(
    (await member.cookies.deleteWithResponse({ credentials: "include" })).response.status,
    200,
  );
  await auth.accessToken.revoke({ access_token: accessToken });
  // This fixture explicitly exercises account-wide refresh revocation. Real logout
  // should not revoke a shared member refresh token unless that scope is intended.
  await auth.refreshToken.revoke({ refresh_token: tokens.refresh_token });
}
console.log(
  "Synthetic auth/cookies: all three selectors, member use, refresh, cookie metadata, redirect and revocation pass",
);
