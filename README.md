# circleso

Type-safe TypeScript SDK for Circle. Ships ESM-first with CJS fallback and runs on Node 18+.

## Features

- Strongly typed requests and responses from the official OpenAPI specs
- Admin, Headless, and Headless Auth surfaces in one SDK
- Smart fetch with timeouts, retries, and safe error parsing
- Optional headless token auto-refresh with single-flight behavior
- ESM and CJS builds with subpath exports

## Requirements

- Node 18+
- Admin API usage must run on a server runtime (see browser caveats below)

## Installation

```bash
npm install circleso
```

## Exports

- `circleso` - shared helpers and the unified `CircleSo` client
- `circleso/admin` - Admin API v2
- `circleso/headless` - Headless Client API v1
- `circleso/auth` - Headless Auth API v1

## Quick start

### Unified client (CircleSo)

```ts
import { CircleSo } from "circleso";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;

if (!adminToken || !headlessToken || !refreshToken) {
  throw new Error(
    "Missing CIRCLE_ADMIN_TOKEN, CIRCLE_HEADLESS_TOKEN, or CIRCLE_HEADLESS_REFRESH_TOKEN.",
  );
}

const sdk = new CircleSo({
  communityHost: process.env.CIRCLE_COMMUNITY_HOST,
  admin: { token: adminToken },
  headless: {
    accessToken: headlessToken,
    refreshToken,
    autoRefresh: true,
  },
  auth: { token: refreshToken },
  timeoutMs: 10_000,
  retries: { retries: 2, baseDelayMs: 200, maxDelayMs: 2000 },
});

const posts = await sdk.admin.posts.list({ page: 1, per_page: 20 });
console.log(posts?.records ?? []);
```

### Admin API v2 (Token + optional communityHost)

```ts
import { createAdmin } from "circleso/admin";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
if (!adminToken) {
  throw new Error("Missing CIRCLE_ADMIN_TOKEN.");
}

const admin = createAdmin({
  token: adminToken,
  communityHost: process.env.CIRCLE_COMMUNITY_HOST,
});

const data = await admin.accessGroups.list({
  page: 1,
  per_page: 50,
});

console.log(data?.records ?? []);
```

Need the low-level OpenAPI client? Use `admin.raw` or `createAdminClient`.

### Headless API (Bearer)

```ts
import { createHeadless } from "circleso/headless";

const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
if (!headlessToken) {
  throw new Error("Missing CIRCLE_HEADLESS_TOKEN.");
}

const headless = createHeadless({
  accessToken: headlessToken,
});

const data = await headless.bookmarks.list({
  page: 1,
  per_page: 20,
});

console.log(data?.records ?? []);
```

Optional auto-refresh when tokens expire:

```ts
const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
if (!headlessToken || !refreshToken) {
  throw new Error("Missing CIRCLE_HEADLESS_TOKEN or CIRCLE_HEADLESS_REFRESH_TOKEN.");
}

const headless = createHeadless({
  accessToken: headlessToken,
  refreshToken,
  autoRefresh: true,
});
```

Need the low-level OpenAPI client? Use `headless.raw` or `createHeadlessClient`.

### Headless Auth (refresh access token)

```ts
import { createAuth } from "circleso/auth";

const refreshToken = process.env.CIRCLE_HEADLESS_REFRESH_TOKEN;
if (!refreshToken) {
  throw new Error("Missing CIRCLE_HEADLESS_REFRESH_TOKEN.");
}

const auth = createAuth({
  token: refreshToken,
});

const data = await auth.accessToken.refresh({
  refresh_token: refreshToken,
});

console.log(data?.access_token);
```

Need the low-level OpenAPI client? Use `auth.raw` or `createHeadlessAuthClient`.

## Configuration

Default base URL for all clients is `https://app.circle.so`. `communityHost` is optional and defaults to
`app.circle.so` if omitted.

Common options across all clients:

- `timeoutMs`: request timeout in milliseconds
- `retries`: `{ retries, baseDelayMs, maxDelayMs, jitterRatio, retryNonIdempotent }`
- `userAgent`: custom user-agent value
- `logger`: hooks for request/response logging with redaction
- `fetcher`: custom fetch implementation

Per-surface options:

- `admin`: `token`, `communityHost`, `baseUrl`
- `headless`: `accessToken` or `token`, `refreshToken`, `autoRefresh`, `authBaseUrl`, `communityHost`
- `auth`: `token`, `communityHost`, `baseUrl`

Note: the unified `CircleSo` class constructs all three surfaces, so it requires
an Admin token, Headless token, and Headless refresh token. If you only need
one surface, use `createAdmin`, `createHeadless`, or `createAuth` directly.

## Browser vs server caveats

The Admin API requires a `host` header with your community domain. Browsers cannot set the `Host` header,
so Admin API calls must be made from a server runtime or a proxy you control. If `communityHost` is omitted,
it defaults to `app.circle.so`.

## Error handling

The low-level fetch utilities throw rich error objects when HTTP responses are not OK. Catch
`CircleHttpError` to inspect status, request ID, and error bodies.

```ts
import { CircleHttpError, createSmartFetch } from "circleso";

const smartFetch = createSmartFetch({ baseUrl: "https://api-headless.circle.so" });

try {
  await smartFetch("/api/headless/v1/bookmarks");
} catch (error) {
  if (error instanceof CircleHttpError) {
    console.error(error.status, error.url);
    console.error(error.requestId);
    console.error(error.bodyText ?? error.parsedJson);
  } else {
    throw error;
  }
}
```

## Pagination

Use the pagination helpers directly, or the headless iterator helpers for common flows.

### Offset pagination (page + per_page)

```ts
import { paginateOffset, toAsyncIterator } from "circleso";
import { createAdmin } from "circleso/admin";

const adminToken = process.env.CIRCLE_ADMIN_TOKEN;
if (!adminToken) {
  throw new Error("Missing CIRCLE_ADMIN_TOKEN.");
}

const admin = createAdmin({
  token: adminToken,
  communityHost: process.env.CIRCLE_COMMUNITY_HOST,
});

const pages = paginateOffset({
  perPage: 50,
  maxItems: 120,
  fetchPage: async ({ page, perPage }) => {
    const data = await admin.accessGroups.list({
      page,
      per_page: perPage,
    });
    return data ?? { records: [], has_next_page: false };
  },
});

for await (const accessGroup of toAsyncIterator(pages)) {
  console.log(accessGroup.id, accessGroup.name);
}
```

### ID window pagination (chat room messages)

```ts
import { createHeadless } from "circleso/headless";

const headlessToken = process.env.CIRCLE_HEADLESS_TOKEN;
const chatRoomUuid = process.env.CIRCLE_CHAT_ROOM_UUID;
if (!headlessToken || !chatRoomUuid) {
  throw new Error("Missing CIRCLE_HEADLESS_TOKEN or CIRCLE_CHAT_ROOM_UUID.");
}

const headless = createHeadless({
  accessToken: headlessToken,
});

for await (const msg of headless.iter.chatRoomMessages(chatRoomUuid, {
  direction: "previous",
  maxItems: 100,
})) {
  console.log(msg.id, msg.body);
}
```

## Logging

Provide `logger` hooks to capture requests and responses. Sensitive headers and token-like fields
are redacted by default.

```ts
import { createAdmin } from "circleso/admin";

const admin = createAdmin({
  token: process.env.CIRCLE_ADMIN_TOKEN ?? "",
  logger: {
    onRequest: ({ request }) => console.log(request.method, request.url),
    onResponse: ({ response }) => console.log(response.status),
  },
});
```

## Examples

Runnable scripts are in `examples/`:

```bash
npx tsx examples/admin-list-something.ts
npx tsx examples/headless-create-bookmark.ts
npx tsx examples/refresh-token.ts
```

Required environment variables:

- Admin example: `CIRCLE_ADMIN_TOKEN`, optional `CIRCLE_COMMUNITY_HOST` (defaults to `app.circle.so`)
- Headless bookmark example: `CIRCLE_HEADLESS_TOKEN`, `CIRCLE_BOOKMARK_RECORD_ID`, optional `CIRCLE_BOOKMARK_TYPE`
- Refresh example: `CIRCLE_HEADLESS_REFRESH_TOKEN`

## Update API specs

Run the sync and generation scripts together:

```bash
npm run spec:sync && npm run gen:types
```

## License

MIT. See `LICENSE`.
