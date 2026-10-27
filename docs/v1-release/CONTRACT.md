# circleso v1 public and support contract

Decision date: October 27, 2026. This is the target for 1.0.0, not a statement that 0.3.0 or the
baseline checkout already satisfies it. [AUDIT.md](AUDIT.md) and [results/01.md](results/01.md)
record the gaps and qualification evidence. The package remains at 0.3.0 until the release tasks.

## Supported scope

V1 covers the official Admin API V2, Headless Member/Client API V1 and Headless Auth specifications.
All supported operations must be available through both typed raw clients and named resources
before release, subject to explicitly documented authoritative schema limitations. The initial
inventory is 172 Admin, 102 Member and 4 Auth operations; it is a route inventory, not a measure
of test coverage. Task 02 will automate verification as upstream inputs change.

Data API and legacy Admin V1 are separate follow-ups. WebSockets, Circle MCP/webhook integrations
and Circle Plus mobile helpers are excluded from this plan. UI components, secret storage and
guessed undocumented behavior are outside the SDK's scope.

## Entry points and compatibility

Preserve these public package paths and their existing exports:

| Entry point | Runtime API |
| --- | --- |
| `circleso` | `CircleSo`, all surface factories/clients, shared helpers and errors listed below |
| `circleso/admin` | `createAdmin`, `createAdminClient`, shared error classes |
| `circleso/headless` | `createHeadless`, `createHeadlessClient`, shared error classes |
| `circleso/auth` | `createAuth`, `createHeadlessAuthClient`, shared error classes |

Root helpers are `createClient`, `createSmartFetch`, `createAdminAuthMiddleware`,
`createBearerAuthMiddleware`, `createHostHeaderMiddleware`, `createLoggerMiddleware`, `joinPath`,
`joinUrl`, `withQuery`, `paginateOffset`, `paginateByIdWindow` and `toAsyncIterator`. Shared error
exports are `CircleSdkError`, `CircleHttpError`, `CircleNetworkError`, `CircleTimeoutError` and
`CircleConfigError`. Retain existing exported configuration, request, pagination, logger and
surface types as well. Source files outside these four package paths are not promised deep imports.

Keep existing resource names, nested resources, flat options, `.raw` and `.iter` APIs. Additive
helpers must preserve those call shapes. Named resources return typed success data, or `undefined`
for a successful response with no content. Raw clients preserve openapi-fetch's
`{ data, error, response }` result, including HTTP failures represented in `error`; transport and
decoding failures may throw. Consumers should use `response.ok`, not error-payload truthiness.

Maintain ESM import and CJS require, with matching declarations for each path. Declaration
dependencies must resolve from an installed npm tarball. Task 11 owns the baseline CJS typing
defect; CJS runtime success alone does not qualify TypeScript support.

Treat removed exports/options/fields, newly required arguments, changed response types and
dropped supported runtimes/compilers as breaking changes. Generated types are public contracts:
an upstream spec update does not waive semantic versioning. The existing refresh contains breaking
type changes documented in [CHANGELOG.md](../../CHANGELOG.md); release it with the v1 migration.
After 1.0.0, compatible fixes are patches and compatible additions are minors; incompatible public
changes require a major version. Recheck upstream drift and document its migration impact.

## Runtime and compiler matrix

This matrix is a release qualification requirement. Only the local baseline evidence in result 01
has been run so far; no untested platform/version is claimed as verified.

| Target | V1 decision | Required evidence / owner |
| --- | --- | --- |
| Node 22 and 24 | Latest maintained patches; minimum major 22; recommend Node 24 | Linux matrix and representative Windows/macOS jobs (03); tarball consumers (11, 22) |
| Node 18 and 20 | Excluded from v1 support | Major-version engine/build migration (11) |
| Node 26 | Current on the decision date; LTS scheduled October 28, 2026 | Reassess in 03 and release preparation; no support claim until qualified |
| TypeScript | Minimum 5.9.3, plus the current stable compiler when qualifying the release | Strict consumers with Node16, NodeNext and Bundler resolution as applicable (11) |
| Browser | Headless Member in the latest two stable Chromium/Firefox releases and current/previous Safari at qualification time | Real-browser tests and bundle checks (11, 22); record exact versions |
| Browser workers | Headless use subject to Fetch API availability and credential/CORS behavior | Configuration and worker smoke tests (09, 22) |
| Other runtimes | Bun, Deno, edge runtimes and React Native are not part of the initial guaranteed matrix | Separate evidence needed before making support claims |

Use ES2022 and Fetch primitives (`fetch`, `Request`, `Response`, `Headers`, `AbortController`,
`ReadableStream`); caller code needs the applicable DOM/Fetch types for compilation. The SDK does
not promise to install global polyfills. Supplying a custom fetcher does not by itself supply the
other primitives. Browser packages must bundle without Node-only dependencies at runtime.

Node's official schedule gives end-of-life dates of April 30, 2025 for 18, April 30, 2026 for 20,
April 30, 2027 for 22, and April 30, 2028 for 24. Recheck maintained versions and the exact browser
matrix before candidate/stable release. A support decision is not proof of execution on that runtime.
The current `engines.node >=18`, `target: node18` and Node 25 development types remain baseline
facts for tasks 03/11 to reconcile; task 01 does not change them.

## Configuration and credential boundaries

All clients default to `https://app.circle.so` unless `baseUrl` is explicitly set. Admin's optional
`communityHost` defaults to `app.circle.so` and controls the Host header independently of the
network base URL. Task 09 fixes the baseline coupling between host and URL.

Admin is server-only: creating a client with its required Host-header middleware in a browser-like
runtime must raise `CircleConfigError` with guidance. Headless Member supports browser use with
member credentials. Auth endpoints must respect token privilege: keep the Headless application
token used to create member tokens on the server; browser refresh/revoke/cookie flows require
appropriate member credentials and documented CORS behavior. The SDK does not store secrets for
the user. `CircleSo` constructs all three surfaces and requires each surface's credentials;
use an individual factory when only one API is needed.

Preserve the baseline Admin `Authorization: Token …` and Headless `Authorization: Bearer …`
middleware pending task 09's resolution of Circle's Admin guide/spec disagreement. No alternative
auth scheme is inferred here. Missing auth configuration must fail explicitly.

## Errors and networking

SDK-originated thrown failures must use the four concrete classes below; retain `CircleSdkError`
as their exported common base. Do not leak raw `Error`, `SyntaxError`, DOM exceptions or plain
response objects from SDK internals. Preserve original failures in `cause` when wrapping them.

| Failure | Class and intended context |
| --- | --- |
| Non-2xx through named resources/helpers | `CircleHttpError`: status, resolved URL, method, request/correlation ID when present, best-effort `bodyText` and `parsedJson` |
| Transport failure or caller cancellation | `CircleNetworkError`, preserving the original cause; cancellation must not be retried |
| Successful response cannot be decoded/read | `CircleNetworkError`, with original cause and request/response context (05) |
| SDK deadline exceeded | `CircleTimeoutError`, preserving the cause and configured timeout |
| Invalid configuration | `CircleConfigError`, actionable guidance and original cause where relevant |

Never replace an HTTP failure with a body-parsing failure. Empty, malformed, non-JSON and consumed
error bodies retain best-effort evidence; empty non-2xx responses still fail. Successful 204/205
and empty responses must be handled predictably. Raw clients retain their result contract above.
Tasks 04/05 own normalization and context across requesters, raw clients and iterators.

Centralize timeouts, cancellation, retry decisions and parsing in `src/core/http.ts` and errors
in `src/core/errors.ts`. Request deadlines must cover response-body processing. Preserve caller
signals, cancel retry waits, cap attempts/delays, respect Retry-After, and replay only safe,
replayable requests. Non-idempotent retries require explicit opt-in; no Circle idempotency-key
guarantee is assumed. Task 06 documents exact retry budgets and semantics.

Headless auto-refresh, when enabled, shares one refresh per expired-token event, including late
unauthorized responses. Retry an original request exactly once after refresh. A failed refresh
HTTP call raises that call's `CircleHttpError` with context and does not loop. Transport/timeouts
retain their matching class. Task 07 must classify permission failures without refreshing every 403.

Logging remains opt-in with secret headers redacted by default. Bodies require explicit opt-in;
tokens, refresh tokens, session cookies and auth headers must never be logged. Pagination stays
in `src/core/pagination.ts`, supports bounded pages/items, empty pages and async iteration.

## Review and publication boundaries

Preserve downloaded specs, generate declarations deterministically, and commit the declarations.
The narrow generation-only workaround for Circle's missing `admin_v2_chat_room_message` schema
must leave that response `unknown` until Circle provides an authoritative definition.

Every task ends with validation, an explicit scoped commit, pushed task branch and PR for human
review. Integration must be verified before successor work. Tasks 01–24 do not publish. Task 25
publishes/verifies an accepted candidate, task 26 prepares the stable decision/version, and task 27
publishes/verifies accepted 1.0.0. All release gates in [README.md](README.md) and
[WORKFLOW.md](WORKFLOW.md) still apply; a passing baseline suite does not qualify v1.

## Primary sources checked October 27, 2026

- [Circle documentation index](https://api.circle.so/llms.txt),
  [Admin API](https://api.circle.so/apis/admin-api.md), and
  [Headless authentication quick start](https://api.circle.so/apis/headless/quick-start.md)
- [Node release overview](https://nodejs.org/en/about/previous-releases) and
  [official support schedule](https://github.com/nodejs/Release/blob/main/schedule.json)
- [npm semantic versioning guidance](https://docs.npmjs.com/about-semantic-versioning/)
- [openapi-fetch result contract](https://openapi-ts.dev/openapi-fetch/) and
  [openapi-typescript 7.x Node API](https://openapi-ts.dev/node)

These sources establish upstream facts; the support choices and SDK guarantees above are this
repository's decisions. Installed dependency versions and the baseline source are recorded in result 01.
