# circleso

TypeScript SDK for Circle's Admin V2, Headless Member V1 and Headless Auth APIs.
Typed requests and responses, ESM/CJS exports, retries, timeouts, pagination and token refresh.

## Installation

Install v1 after its stable publication:

```sh
npm install circleso@1.0.0
```

See [v1 release notes](docs/release-v1.md) for release status and
[migration from 0.3.0](docs/migration-v1.md) for breaking changes.
`1.0.0` is prepared for publication; `next` currently selects `1.0.0-rc.1`.

Requires Node.js 22 or 24. TypeScript users need 5.9.3 or newer and DOM/Fetch types.
The Member client also supports browsers and browser workers with Fetch and CORS support.
Admin, Auth and built-in token refresh run on your server.

## Quick start

### Admin API

Create an Admin V2 token in Circle and keep it on your server:

```ts
import { createAdmin } from "circleso/admin";

const token = process.env.CIRCLE_ADMIN_TOKEN;
if (!token) throw new Error("Missing CIRCLE_ADMIN_TOKEN.");

const admin = createAdmin({ token, timeoutMs: 10_000 });
const posts = await admin.posts.list({ page: 1, per_page: 20 });
console.log(posts?.records ?? []);
```

### Member API

Use a member access token issued by your authenticated server. Keep Headless Auth
application tokens and member refresh tokens on the server.

```ts
import { createHeadless } from "circleso/headless";

const accessToken = process.env.CIRCLE_HEADLESS_TOKEN;
if (!accessToken) throw new Error("Missing CIRCLE_HEADLESS_TOKEN.");

const member = createHeadless({ accessToken, timeoutMs: 10_000 });
const bookmarks = await member.bookmarks.list({ page: 1, per_page: 20 });
console.log(bookmarks?.records ?? []);
```

The example above runs on Node. In a browser, obtain the member token from your own
server; see [authentication and cookies](docs/authentication.md) for token issuance,
refresh and browser integration.

### Choose a client

| Import | Purpose | Credential |
| --- | --- | --- |
| `circleso/admin` → `createAdmin` | Community administration | Admin V2 token |
| `circleso/headless` → `createHeadless` | Member actions | Member access token |
| `circleso/auth` → `createAuth` | Issue, refresh and revoke tokens | Headless Auth application token |
| `circleso` → `CircleSo` | All three clients together on a server | Credentials for each client |

All entry points support ESM `import` and CommonJS `require`.
Each client exposes a typed `raw` OpenAPI client for lower-level requests.

## Configuration

- `baseUrl` defaults to `https://app.circle.so`.
- Admin's `communityHost` sets its Host header, defaults to `app.circle.so`, and requires
  a custom server transport when it differs from the destination. Native Fetch removes Host overrides.
- `timeoutMs` covers each attempt through response-body completion. Set it explicitly;
  the default has no deadline. Pass a per-call `signal` to cancel across retries.
- Retries default to two for eligible methods and failures, including rate limits.
  POST/PATCH are not retried by default. For deliberate mutations, set `retries: { retries: 0 }`.
- Named methods take flat query/body options, for example `{ page: 1, per_page: 20 }`.

See [client configuration](docs/client-configuration.md) for all options, retry behavior,
token refresh and redacted logging, and [request options](docs/request-options.md) for serialization.

## Error handling

Named methods throw SDK errors. Catch `CircleHttpError` for HTTP failures:

```ts
import { CircleHttpError, createAdmin } from "circleso/admin";

const token = process.env.CIRCLE_ADMIN_TOKEN;
if (!token) throw new Error("Missing CIRCLE_ADMIN_TOKEN.");
const admin = createAdmin({ token, timeoutMs: 10_000 });

try {
  await admin.posts.list({ page: 1, per_page: 20 });
} catch (error) {
  if (error instanceof CircleHttpError) {
    console.error("Circle request failed", error.status);
  } else {
    throw error;
  }
}
```

Other failures use `CircleNetworkError`, `CircleTimeoutError` or `CircleConfigError`.
Raw clients return `{ data, error, response }` for HTTP responses; check `response.ok`.
Error bodies and causes may contain sensitive data; keep diagnostics redacted.

## Documentation

- [API reference](docs/api-reference.md) — clients, resources, types and schema limitations
- [Pagination](docs/pagination.md) — bounded async iterators
- [File uploads](docs/file-uploads.md) and [rich text](docs/rich-text.md)
- [Usage controls](docs/usage-controls.md) — optional concurrency, queues and request budgets
- [Examples](https://github.com/atomimus/circleso/tree/main/examples)
- [Support and compatibility](SUPPORT.md), [changelog](CHANGELOG.md) and [security reporting](SECURITY.md)
- [Contributing](CONTRIBUTING.md)

## License

[MIT](LICENSE)
