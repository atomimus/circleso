# Authentication and Circle session cookies

Checked against Circle's current documentation and the committed Auth/Member specs on
October 27, 2026. These recipes target this unreleased v1 checkout. Run the entirely
synthetic [auth/cookie fixture](https://github.com/atomimus/circleso/blob/main/examples/auth-and-cookies.ts) with
`npx tsx examples/auth-and-cookies.ts` after building the checkout. It exercises every
flow below without credentials or Circle requests. The package checks compile these
recipes; they never execute live authentication examples.

## Credentials and ownership

| Value | Used for | Ownership |
| --- | --- | --- |
| Admin API token | Admin `Authorization: Token …` | Server only; not interchangeable with Headless credentials |
| Headless Auth application token | `createAuth({ token })`, Bearer on all four Auth operations | Server only; generate the **Headless Auth** token type in Circle |
| Member access token | `createHeadless({ accessToken })`, Bearer on Member calls | One authenticated member; browser use is supported subject to CORS |
| Member refresh token | Auth refresh/revoke JSON body | Sensitive member credential; this recipe retains it on the server |
| Circle session cookies | Circle website/iframe session | Browser cookie rules determine storage and scope |

The SDK uses strings for credentials, not proof of their identity or scope. Its token
configuration checks syntax; passing an application token as `accessToken` cannot be
recognized locally. Generated token response fields are optional, so check the fields
your application needs. The SDK has no persistent secret store, cookie jar, user registry
or automatic JWT validation. It retains configured credentials in each client's memory.

[Circle's Headless overview](https://api.circle.so/apis/headless) currently documents
independent access tokens lasting one hour and **one shared refresh token per member per
account**, revoked automatically after one month. Use returned expiration timestamps
where present. Do not assume refresh extends that lifetime or rotates the refresh token.
Revoking it prevents refresh across that member's sessions. Revoking one access token
targets that token; no undocumented cascade to other access tokens or website cookies is
promised. The [Auth SDK security page](https://api.circle.so/apis/headless/auth-sdk/getting-started)
recommends secure credential storage and server execution.

Authenticate the person in your own application and authorize their community membership
**before** selecting their email, member ID or SSO ID. Never expose an endpoint that mints
tokens for arbitrary caller-supplied identities. Keep clients/getter/setter closures scoped
to one member session. A module-global mutable Member client can leak credentials between
requests. An application-token-only Auth client may be reused on the server. Token/session
responses and redirect responses should use `Cache-Control: no-store`; protect your own
login, refresh and logout routes with your authentication and CSRF policies.

## Issue and use a member token on the server

These are three selectors for **one POST operation**, not three missing endpoints.
The spec gives SSO ID precedence over member ID, then email when several are supplied.
This recipe intentionally supplies one. The application must derive `identity` from a
verified principal, not accept it as unauthenticated form input.

```ts
import { createAuth, CircleNetworkError } from "circleso/auth";
import { createHeadless } from "circleso/headless";

type VerifiedIdentity =
  | { email: string }
  | { community_member_id: number }
  | { sso_user_id: string };

export async function issueMemberSession(applicationToken: string, identity: VerifiedIdentity) {
  const auth = createAuth({ token: applicationToken, retries: { retries: 0 } });
  // Call with { email }, { community_member_id } or { sso_user_id }.
  const tokens = await auth.authToken.create(identity);
  if (!tokens?.access_token || !tokens.refresh_token) {
    throw new CircleNetworkError("Auth response did not contain the required member tokens.", undefined);
  }
  const member = createHeadless({ accessToken: tokens.access_token });
  const bookmarks = await member.bookmarks.list();
  // Caller owns secure, per-member storage. Never log tokens or return the app token.
  return { tokens, member, bookmarks };
}
```

The [quick start](https://api.circle.so/apis/headless/quick-start) describes token issuance;
the [Auth methods](https://api.circle.so/apis/headless/auth-sdk/node.js/methods) describe
refresh and revocation. Auth requires the application token in its Bearer header even
when the JSON body contains a member refresh/access token. A refresh token is never the
application Bearer credential. Defaults use `https://app.circle.so`.

## Refresh and logout deliberately

```ts
import { createAuth, CircleNetworkError } from "circleso/auth";
import { createHeadless } from "circleso/headless";

export async function refreshMemberSession(applicationToken: string, refreshToken: string) {
  const auth = createAuth({ token: applicationToken, retries: { retries: 0 } });
  const refreshed = await auth.accessToken.refresh({ refresh_token: refreshToken });
  if (!refreshed?.access_token) throw new CircleNetworkError("Refresh returned no access token.", undefined);
  // Save the new access token/expiry for this member. Keep the existing refresh token.
  return { refreshed, member: createHeadless({ accessToken: refreshed.access_token }) };
}

export async function revokeSessionAccess(applicationToken: string, accessToken: string) {
  const auth = createAuth({ token: applicationToken, retries: { retries: 0 } });
  await auth.accessToken.revoke({ access_token: accessToken }); // successful 204 => undefined
}

export async function stopAllMemberRefresh(applicationToken: string, sharedRefreshToken: string) {
  const auth = createAuth({ token: applicationToken, retries: { retries: 0 } });
  // Account-wide for this member: call only when that scope is intended.
  await auth.refreshToken.revoke({ refresh_token: sharedRefreshToken });
}
```

Clear your application's own session state according to its policy. Deleting Circle
cookies, revoking access, revoking shared refresh and logging out of your own app are
separate actions, not an atomic transaction. If a step fails, reconcile its outcome;
there is no general idempotency or rollback guarantee. Keep a valid member access token
until any requested cookie deletion has completed.

Built-in `autoRefresh` is server-only and needs `accessToken`, `refreshToken` and the
application `authToken`. It shares refresh within that **client instance**, handles 401
once and replays the original request once; 403 does not refresh. Failure remains cached
for that observed token generation until external token rotation or a new client. It
does not coordinate separate processes. Browser clients should use `getAccessToken` with
their own authenticated server refresh flow; never send `authToken` to browsers/workers.
See the [README refresh contract](../README.md#configuration).

## Cookie APIs and typed metadata

`cookies.create()` / `cookies.delete()` keep returning parsed data. Their additive
`createWithResponse()` / `deleteWithResponse()` counterparts return
`CircleResponse<Data> = { data, response }`: data follows the generated response type
(including `undefined` for an empty response); `response` exposes status, headers and URL.
JSON has already been read, so do not read that response body again. HTTP failures still
throw `CircleHttpError`; malformed successful JSON remains `CircleNetworkError`.

```ts
import { createHeadless, type CircleResponse } from "circleso/headless";

export async function cookieMetadata(memberAccessToken: string, trustedCommunityOrigin: string) {
  const member = createHeadless({ accessToken: memberAccessToken, baseUrl: trustedCommunityOrigin });
  const result: CircleResponse<{ message?: string } | undefined> =
    await member.cookies.createWithResponse({ credentials: "omit" });
  // Server only: getSetCookie preserves separate header values, including Expires commas.
  const setCookies = result.response.headers.getSetCookie();
  return { data: result.data, status: result.response.status, setCookies };
}
```

Use the actual community domain as `baseUrl` for cookies. `communityHost` does not change
the Member destination or inject Host. The current Member spec explicitly rejects creation
on a domain belonging to another community. `credentials` is already available per call
on all named resources and raw clients: `include`, `same-origin` (Fetch default), or `omit`.
It controls browser cookie handling, not the SDK's explicit Bearer header. Node Fetch has
no automatic cookie jar; `include` does not create one.

Raw access also preserves metadata: `member.raw.POST("/api/headless/v1/cookies", { credentials:
"include" })` returns `{ data, error, response }`. Raw HTTP failures remain results; check
`response.ok`. Use raw `parseAs: "stream"` when you need an unread body, then consume/cancel
the stream. `member.raw["/api/headless/v1/cookies"].DELETE(...)` is equivalent path-based access.

## Forward Set-Cookie on a server you control

This Node recipe is valid only when your endpoint is served on the **same public origin
as the configured community**, for example through a controlled reverse proxy. A host-only
cookie forwarded by `app.example.com` belongs to that host, not `community.example.com`.
Merely sharing a registrable domain does not fix host scope. Never rewrite Domain, Path,
SameSite, Secure, HttpOnly, expiry or names to make an incompatible deployment appear to
work. Do not forward another user's Cookie header or cache these responses.

```ts
import type { ServerResponse } from "node:http";
import { createHeadless } from "circleso/headless";

// Call after your server authenticates/authorizes the member and checks CSRF.
export async function forwardCircleCookies(
  outgoing: ServerResponse,
  memberAccessToken: string,
  trustedCommunityOrigin: string,
  trustedPublicOrigin: string, // deployment config, not an untrusted Host header
  action: "create" | "delete",
) {
  if (new URL(trustedPublicOrigin).origin !== new URL(trustedCommunityOrigin).origin) {
    throw new Error("Unmodified Circle cookie forwarding requires the same public origin.");
  }
  const member = createHeadless({
    accessToken: memberAccessToken,
    baseUrl: trustedCommunityOrigin,
    retries: { retries: 0 },
  });
  const result = action === "create"
    ? await member.cookies.createWithResponse({ credentials: "omit" })
    : await member.cookies.deleteWithResponse({ credentials: "omit" });
  outgoing.setHeader("Cache-Control", "no-store");
  const cookies = result.response.headers.getSetCookie();
  if (cookies.length) outgoing.setHeader("Set-Cookie", cookies); // array, never split on commas
  outgoing.statusCode = result.response.status;
  if (result.data === undefined) outgoing.end();
  else {
    outgoing.setHeader("Content-Type", "application/json");
    outgoing.end(JSON.stringify(result.data));
  }
}
```

Do not copy all upstream headers, pass cookies to SDK loggers, or log the returned raw
metadata. Custom server fetchers must preserve multiple Set-Cookie values. Supported Node
runtimes expose `Headers.getSetCookie()`; a transport that collapses them loses information.

## Browser request or documented navigation

[Circle's cookie guide](https://api.circle.so/apis/headless/member-api/cookies) supports
POST with a member Bearer token. This browser function receives only the signed-in member's
access token from your own authenticated server flow:

```ts
import { createHeadless } from "circleso/headless";

export async function setBrowserCircleCookies(memberAccessToken: string) {
  const member = createHeadless({
    accessToken: memberAccessToken,
    baseUrl: "https://community.example.com", // trusted configured Circle community domain
  });
  return member.cookies.create({ credentials: "include" });
}

export async function clearBrowserCircleCookies(memberAccessToken: string) {
  const member = createHeadless({ accessToken: memberAccessToken, baseUrl: "https://community.example.com" });
  return member.cookies.delete({ credentials: "include" });
}
```

Cross-origin use needs server CORS permission for the exact requesting origin,
credentials and Authorization preflight. Cookie Domain/Path/SameSite/Secure rules and
third-party-cookie/iframe policies still apply. JavaScript cannot set the Cookie header
or read network Set-Cookie; even `getSetCookie()` returns no network cookies in browsers.
A 200 response alone does not prove browser storage or iframe authentication. The SDK
does not bypass these policies. Check the actual deployment in supported browsers.

Circle also documents top-level navigation to `/session/cookies?access_token=…`, followed
by its configured `/` or `/home`. The helper fixes that route, accepts only a trusted HTTPS
origin with no path/query/fragment/userinfo and URL-encodes the member token. It does not
authenticate the origin, validate the token's role/ownership/expiry, send a request, choose
a return destination or set cookies itself. Never take the origin from untrusted input.

```ts
import { createSessionCookiesUrl } from "circleso/headless";

export function navigateToCircle(memberAccessToken: string) {
  const url = createSessionCookiesUrl({
    communityUrl: "https://community.example.com",
    accessToken: memberAccessToken,
  });
  window.location.assign(url); // sensitive URL: do not log, render, cache or share it
}
```

This documented mechanism places a credential in a URL: browser history, infrastructure
and analytics may record it. Use an appropriate Referrer-Policy and restrict logging in
your own deployment. SDK logger snapshots already omit **all** URL query values and redact
Cookie/Set-Cookie/Authorization and string body values, including `access_token`. The helper
does not log. Raw responses, thrown errors/causes, application redirects, proxies and Circle's
own navigation are outside that logger guarantee; treat them as sensitive.

## Evidence and limits

All local tests use synthetic fetch/browser/server fixtures, including separate users,
refresh, 204 revokes, credential forwarding, multiple Set-Cookie values and logger redaction.
The runnable fixture never performs live login/logout. Browser mocks/VM probes do not
qualify real cookie storage, CORS, workers or iframe privacy policy. Live acceptance needs
an explicitly configured authorized test community/account; production members are not
fixtures. No live session changes were performed for these recipes.

Contract sources: [Auth OpenAPI](https://api-headless.circle.so/api/headless_auth/swagger.yaml),
[Member OpenAPI](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[openapi-fetch API](https://openapi-ts.dev/openapi-fetch/api) (installed 0.15.0), and
[Fetch's Set-Cookie header rules](https://fetch.spec.whatwg.org/#dom-headers-getsetcookie).
Current auth operations, cookie operations and their referenced schemas were independently
compared with the committed specs; no spec refresh or undocumented operation was added.
