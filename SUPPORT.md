# Support and compatibility

This repository's v1 work is unreleased. Published 0.3.0 retains its historical contract;
see [migration](docs/migration-v1.md) and the [API reference](docs/api-reference.md).
No release date, response-time SLA or commercial Circle support is implied.

| Surface | SDK scope | Runtime boundary |
| --- | --- | --- |
| Admin V2 | All 172 committed operations, raw and named | Node server; Token and Host |
| Headless Member V1 | All 102 committed operations, raw and named | Fetch runtime with Member Bearer |
| Headless Auth V1 | All four committed operations | Server-only application Bearer |
| [Data API](docs/data-api.md) and legacy Admin V1 | Future, separate integration work | No supported client in this package |
| WebSocket, MCP/webhooks, Circle Plus mobile/UI | Outside this v1 SDK scope | No integration provided |

Operation counts measure exposure, not complete schema accuracy or every server behavior.
Upstream untyped successes, missing chat-import response schema, nested deepObject ambiguity
and member-search cursor conflict are documented in the [reference](docs/api-reference.md).
Types are not a runtime validator. Runtime nulls and best-effort error bodies are preserved.
Circle plan eligibility, quotas and behavior can change independently of this package.

The v1 Node engine range is `^22.0.0 || ^24.0.0`; use maintained patches, preferably 24.
Node 18/20 and other majors are unqualified. TypeScript minimum is 5.9.3, with 7.0.2 also
checked; strict Node16/NodeNext/Bundler consumers use real installed ESM/CJS exports and
`skipLibCheck: false`. Standard Fetch/AbortController/ReadableStream globals are required;
no polyfills are installed. See the [CI matrix](docs/ci.md) for exact hosted targets.

Browser acceptance uses actual Chromium, Firefox and WebKit with local HTTPS fixtures on
Ubuntu; Windows Playwright WebKit 27.2 is unqualified because native Fetch ignores cookie
omission there. See [acceptance testing](docs/acceptance.md) for targets, commands and limits.
Authorized live-community checks require separate explicit configuration. Do not interpret
the Member runtime design as certification for every browser, edge runtime, Deno or Bun.
The browser enforces Set-Cookie visibility, cookie domain/SameSite, third-party restrictions
and storage upload CORS. Admin/Auth/application refresh remain server-only even with a
custom fetcher. Keep secrets out of client bundles and use a verified server identity.

Report SDK bugs through [GitHub issues](https://github.com/atomimus/circleso/issues).
Include SDK/runtime/compiler versions, affected method, a synthetic reproduction,
sanitized status/request ID and expected versus observed behavior. Omit tokens, cookies,
signed URLs, private identifiers, payloads and raw error causes. Security-sensitive reports
use the verified [private vulnerability form](https://github.com/atomimus/circleso/security/advisories/new).
See [SECURITY.md](SECURITY.md) for disclosure and supported-version policy. Do not post
exploit credentials publicly. No security response-time SLA is promised.

Changes to supported public exports, runtime behavior, required inputs or generated public
types are evaluated for semantic-version compatibility. Breaking changes require a major
version and migration notes. Accepted upstream changes may therefore wait for a major
release; a newer live spec is not automatically shipped by ordinary builds or installs.
Use [contributing guidance](CONTRIBUTING.md) and [release maintenance](docs/release-maintenance.md)
to reproduce checks and update accepted contracts.
