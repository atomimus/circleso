# Acceptance and live integration

Qualification uses the actual `npm pack --ignore-scripts` artifact, installed outside the
checkout with scripts/development dependencies disabled and no source aliases. Run
`npm ci`, `npm run build`, then the commands below. Public tests contact local fixtures;
dependency/browser installation downloads public packages and Playwright binaries.
No Circle credentials are read by ordinary tests or `test:browser`.

## Node and TypeScript

`npm run test:package` runs the export, declaration, documentation and synthetic workflow
gates described in [CI](ci.md). It also compiles and executes a composed application as
ESM and CJS under TypeScript 5.9.3/7.0.2 and Node16/NodeNext/Bundler resolution, with
`skipLibCheck: false`. Bundler's preserved imports receive an esbuild transform without
bundling; Node resolves the real installed imports/requires. The workflow combines Admin
reads, Auth issuance, concurrent Member 401 recovery with one refresh, bounded pagination,
native HTTPS storage upload/MD5, rich-text post creation, cookie metadata, cancellation
and named/raw errors. All identities, writes and tokens are synthetic local fixtures.

Hosted Node targets remain 22/24 on Ubuntu, plus Node 24 on Windows/macOS. Inspect the
exact source run's logged patch/compiler versions and results; a matrix declaration is
not execution evidence. These tests do not validate Circle's live implementation.

## Real browsers

Install the pinned Playwright 1.64.1 browsers, then run:

```sh
node node_modules/playwright/cli.js install --with-deps chromium firefox webkit
npm run test:browser
```

The separate bounded Ubuntu jobs on Node 22/24 require Chromium, Firefox and WebKit.
Vitest drives actual browser pages and classic/module dedicated workers. Each engine
uses an isolated browser context and two local HTTPS origins. Static test-only TLS
certificates are accepted only in that context; never trust the fixture private key for
anything else. Node fixture subprocesses trust only the fixture CA in their own process.

The SDK bundles resolve installed exports, contain no Node imports/polyfills, and remove
unused server factories from Member code. Native Fetch, CORS preflights/denial, request
bytes, token hooks, pagination, server-factory rejection, cancellation before dispatch
and during response reads, SDK deadlines, HTTP/raw errors, File checksum/upload,
storage redirect refusal and HttpOnly cookie creation/deletion are asserted.
Native CSP limits browser connections to the fixture origins; request interception,
disabled web security and response mocks are not used. Service workers are blocked.

Cookie checks use same-site, cross-origin HTTPS ports, compare the default with native
Fetch, and explicitly test `omit`/`include`. JavaScript cannot read Set-Cookie or HttpOnly
values. Storage requests must omit cookies, Authorization and referrers even when the
browser cookie jar contains matching cookies. This does not certify cross-site iframes,
third-party/partitioned cookie policies, deployed Circle CORS, installed Safari/Chrome,
extensions, service/shared workers or every operating system/browser version.

On Windows, Playwright's WebKit 27.2 port was observed sending native Fetch cookies with
`credentials: "omit"`, including without this SDK. That target is **unqualified**, and its
cookie-isolation assertions fail. They are not skipped or relaxed. Use an explicit
`CIRCLE_TEST_BROWSERS=chromium,firefox` environment selection for the qualified Windows
subset; all three engines remain mandatory in Ubuntu CI. A failing runtime that ignores
`omit` cannot provide the SDK's storage-credential isolation contract.

## Explicit live checks

`npm run test:integration` prints **SKIPPED / UNVERIFIED** and sends no Circle traffic
without `CIRCLE_LIVE_TESTS`. `npm run test:integration -- --require-live` fails instead
of skipping. No dotenv files, ambient example credentials, application/Admin tokens or
production defaults are discovered. Never put token values in shell history or chat.

For read-only checks, supply these variables securely:

| Variable | Required value |
| --- | --- |
| `CIRCLE_LIVE_TESTS` | `read-only` |
| `CIRCLE_TEST_COMMUNITY_ACK` | `dedicated-test-community` |
| `CIRCLE_TEST_BASE_URL` | Dedicated authorized community HTTPS origin, without a path; not app.circle.so |
| `CIRCLE_TEST_MEMBER_TOKEN` | Existing access token for the authorized test member |
| `CIRCLE_TEST_COMMUNITY_ID` | Expected positive community ID |
| `CIRCLE_TEST_SPACE_ID` | Expected accessible test space ID |
| `CIRCLE_TEST_MEMBER_ID` | Expected current test member ID |

Only the current-member GET and that fixed-space GET are permitted. Results must match
the configured member, space and community IDs. Redirects and credentials forwarding
are disabled, retries are zero, and each attempt has a 10-second deadline. No response
bodies, tokens, URLs or causes are printed. Ownership/authorization of the configured
community is an operator prerequisite; an ID comparison cannot prove that authorization.

Optional writes need **all** of `CIRCLE_LIVE_WRITES=bookmark`,
`CIRCLE_DISPOSABLE_ACCOUNT_ACK=authorized-disposable-account`, and
`CIRCLE_TEST_POST_ID` for an existing synthetic post in the configured space. Use a
fresh, exclusively controlled disposable account with zero bookmarks. The runner checks
identity/community/post scope and absence of bookmarks before creating one bookmark.
No billing/refund/payout, messages, invitations or post creation is permitted live.

An ignored `.cache/integration/<run>.json` ledger records intent before creation and
the returned ID before ownership validation. Cleanup deletes only that newly returned,
validated bookmark ID, with no retries. Preexisting records and responses with mismatched
ownership are never deleted. Lost creation responses remain `creation-uncertain`;
failed deletion remains `cleanup-pending`. Process termination, unavailable networking,
disk failure and concurrent account use can prevent cleanup. Reconcile the private ledger
deliberately; never retry a creation blindly or delete by guessed IDs. The ledger contains
dedicated test IDs, no token, cookies or response bodies.

The [manual integration workflow](https://github.com/atomimus/circleso/blob/main/.github/workflows/live-integration.yml)
runs only on main in environment `circle-integration`. Configure that environment with
a custom main-only branch policy, the nonsecret ID/origin variables above, and the sole
environment secret `CIRCLE_TEST_MEMBER_TOKEN`. Secrets reach only the explicit integration
step, after dependency installation/build. A manual dispatch must supply the community
acknowledgement; bookmark dispatch additionally needs the disposable-account acknowledgement.
There is no required human review gate. The job fails on missing configuration; ordinary
push/PR jobs have no community secrets or live tests. Only the ownership ledger is retained
as a one-day artifact, including after failure; abrupt runner loss may prevent upload.

Live access, cookie/SSO/CORS behavior against Circle and live writes remain **unverified**
until an explicitly configured authorized run actually passes. A skipped local command,
an undispatched workflow or a successful synthetic fixture is not live-service evidence.

Sources checked October 27, 2026: [Fetch](https://fetch.spec.whatwg.org/),
[Vitest 4](https://v4.vitest.dev/guide/),
[Playwright installation](https://playwright.dev/docs/intro),
[Playwright CI](https://playwright.dev/docs/ci),
[Circle cookies](https://api.circle.so/apis/headless/member-api/cookies),
[Member spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Node releases](https://nodejs.org/en/about/previous-releases),
[GitHub environments](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments)
and [artifact action](https://github.com/actions/upload-artifact/tree/cf430e030ddbb5b0abf93d22962f4752f3646cd9).
