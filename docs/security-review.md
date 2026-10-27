# Security review and operational limits

Reviewed October 27, 2026: accumulated changes from published 0.3.0 source
`5b71bca1b1f088becff4287e189daf0bf01fd09a` through
`b1e56701d378974e0dcfb3cfb5429163e67edfbc`, followed by development dependency and
package-validation updates. Serial source/contract review with synthetic tests;
no independent audit or live penetration test. See [private reporting](../SECURITY.md).

## Controls and limits

| Surface | Evidence and disposition |
| --- | --- |
| Credentials | Factories validate URLs/tokens/Host; Admin and Auth/application refresh reject browser/worker use. Raw overrides/middleware/fetchers carry application authority and must not come from arbitrary user parameters. |
| Redirects | Ordinary Fetch follows redirects. Cross-origin Authorization stripping does not protect JSON refresh tokens or other bodies. Use trusted endpoints and the rejecting transport below for strict destination policy. Storage/spec downloads already refuse redirects. No SDK-controlled untrusted redirect producer was established. |
| Refresh | 401 only, per-generation single flight including late/failing recovery; one replay, no replay retry or automatic refresh PATCH retries. Separate application and refresh credentials. Caller storage owns identity isolation. |
| Logs/errors | Detached snapshots redact headers/string values/route arguments; body inspection is opt-in and bounded. Raw bodies/causes/URLs preserve sensitive diagnostics; never log them wholesale. |
| Uploads | Finite inputs, 64 MiB default cap, chunked MD5, 60-second default workflow deadline. Storage has no Circle auth/hooks/cookies/Host, HTTPS only, no referrer/retries, redirect error and allowlisted headers. MD5 meets the upload protocol, not an authenticity guarantee. Operators own DNS/IP/egress policy. |
| Cookies | Browser owns visibility/domain/SameSite/CORS and third-party restrictions; Node has no SDK cookie jar. Apps own selective forwarding/CSRF. Windows Playwright WebKit 27.2 is unqualified for native cookie omission. |
| Queues/cache | Per-transport admission/circuit state, no SDK response cache. Opt-in usage defaults: four active, 100 queued, 30-second queue wait. Example caches are bounded and caller-owned; partition by identity. |
| Untrusted data | JSON is data. Rich-text snapshots reject accessors/cycles and bound traversal; mutable output is not sanitized. Types retain upstream unknowns/nulls. Request routing rejects unknown fields without establishing runtime schema/authorization validity. |
| Tooling | Fixed HTTPS spec source, no redirects/external refs, 10 MiB download cap, explicit acceptance; builds stay offline. CI actions are SHA-pinned/read-only with credential-free checkout. Optional live secrets are confined to a main-only environment step. |

PUT/DELETE retry by default; disable retries for uncertain financial/access mutations
and reconcile outcomes. No endpoint idempotency is established. Deadlines are per attempt
through body consumption, not total operation deadlines. General API timeouts are disabled
unless configured. JSON readers buffer complete responses; no general response-byte cap
exists. Set deadlines/proxy limits, or consume raw streams with your own byte budget.
Pagination caps are caller-selected; set page/item budgets. Iterators do not prefetch,
snapshot or deduplicate records. Custom transports must honor Request security/abort settings.

## Strict application transport

Limit requests to one trusted HTTPS origin and reject redirects before another request
is sent. Use a trusted allowlist if Member/Auth intentionally use different origins.
An Admin Host-preserving transport still needs its own server implementation.

```ts
import { CircleConfigError, createHeadless } from "circleso/headless";

export function pinnedFetch(origin: string, transport: typeof fetch = fetch): typeof fetch {
  const trusted = new URL(origin);
  if (trusted.protocol !== "https:" || trusted.username || trusted.password) {
    throw new CircleConfigError("A trusted HTTPS origin is required.");
  }
  return async (input, init) => {
    const request = new Request(input, init);
    if (new URL(request.url).origin !== trusted.origin) {
      throw new CircleConfigError("Request destination is outside the configured origin.");
    }
    return transport(new Request(request, { redirect: "error" }));
  };
}

export function memberFor(accessToken: string) {
  return createHeadless({ accessToken, timeoutMs: 10_000,
    fetcher: pinnedFetch("https://app.circle.so") });
}
```

The origin is trusted configuration. This is not DNS rebinding protection or an IP allowlist.

## Dependency findings

Production remains `openapi-fetch@0.15.0` and `openapi-typescript-helpers@0.0.15` (MIT).
Bundled `@noble/hashes@2.4.0` is MIT; its full notice in LICENSE is checked in the tarball.
No runtime dependency was added. All locked entries declare MIT, Apache-2.0, their dual
license, BSD-3-Clause, ISC, Python-2.0 or MIT/CC0-1.0. No copyleft/missing-license entry
was found in this snapshot. Reinspect actual licenses and bundled notices on updates.

Initial npm audit: 12 affected development package entries. Scores/counts describe
upstream conditions, not an established SDK exploit. Updated full/production audits:
zero known vulnerabilities at review time, not proof of security.

| Package | Old → reviewed version | Disposition |
| --- | --- | --- |
| vitest / @vitest/mocker | 4.0.16 → 4.1.12 | UI/server file access and mock registration. CI uses run mode without UI; update the matching family and retain tests. |
| vite | 7.3.0 → 7.3.7 | Dev-server file/editor paths. SDK consumers have no Vite server. Patched 7.x override avoids incidental Vite 8 migration. |
| brace-expansion / minimatch / picomatch | 2.0.2/5.1.6/4.0.3 → 2.1.7/5.1.9/4.0.7 | Glob denial of service/matching correctness; compatible fixes. |
| fast-uri / js-yaml | 3.1.0/4.1.1 → 3.1.9/4.3.2 | URI interpretation/YAML resource exhaustion in spec tooling. Fixed-source/ref controls retained; regeneration stays byte-identical. |
| postcss / source-map-js | 8.5.6/1.2.1 → 8.5.32/1.2.2 | CSS/source-map reading/resource exhaustion in tooling; no SDK CSS surface. Compatible updates. |
| rollup / nanoid | 4.54.0/3.3.11 → 4.65.1/3.3.20 | Build traversal/invalid-size generator exhaustion. Repository-owned inputs, compatible updates, no SDK generator API. |

Matching Vitest dependencies/Rollup platform packages also changed. Existing install
scripts are development esbuild/optional fsevents. Consumers install with scripts disabled.
No forced audit fix or production-major upgrade was used.

## Measured budgets

The installed-tarball gate measures 1,000 parsed reads, bounded pagination, 50 concurrent
reads/one refresh, and 1/16 MiB upload preparation with synthetic transports. It prints
elapsed time, retained heap delta after GC, RSS and peak RSS. Observations include
Node/Fetch/GC/fixture cost, exclude network latency and are neither SLAs nor leak proofs.
Compare the same runtime/platform/workload. Compiler extended diagnostics report memory
and check time for every strict installed consumer pair.

CI review budgets: runtime files ≤350 KiB/70 KiB gzip each; all `.d.ts`/`.d.cts` together
≤3 MiB; browser Member probes ≤220 KiB/45 KiB gzip. These are regression alarms with
headroom, not application bundle guarantees. Maps and duplicate ESM/CJS declarations
contribute separately to install size. Browser probes reject Node imports/globals and
unused retained Admin/Auth factories.

Example local observation on Windows, Node 24.10.0, explicit GC (October 27, 2026):

| Synthetic installed workflow | Elapsed | Verified work |
| --- | ---: | --- |
| 1,000 sequential reads | 120.39 ms | 1,000 parsed responses |
| Lazy pagination | 2.88 ms | 450 items, five pages, no prefetch |
| 50 concurrent reads | 13.09 ms | One refresh, 100 Member attempts |
| 1 MiB upload | 24.14 ms | One registration and isolated drained storage PUT |
| 16 MiB upload | 247.29 ms | One registration and isolated drained storage PUT |

The process peak RSS was 147,388 KiB; these are single-run measurements with cold/warm
runtime effects. Emitted declarations totalled 2,745,186 bytes. Strict consumer compiler
check times were 1.45–1.52 s / 293,193–301,930 K reported memory for TS 5.9.3 and
0.310–0.367 s / 176,811–176,937 K for TS 7.0.2. Repeat measurements on the deployment
runtime; do not extrapolate production latency or a memory ceiling from this fixture.

External qualification remains for authorized live Circle fixtures, installed Safari,
other edge runtimes, service/shared workers and deployment-specific cookies. Upstream
gaps remain in the [reference](api-reference.md). Publication identity, immutable artifact
reconciliation and provenance must be verified before release.

Sources checked October 27, 2026: [GitHub security](https://docs.github.com/en/actions/reference/security/secure-use),
[private reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository),
[npm audits](https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities/),
[Vitest advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-5xrq-8626-4rwp),
[Vitest 4.1.12](https://github.com/vitest-dev/vitest/releases/tag/v4.1.12),
[Vite 7.3.7](https://github.com/vitejs/vite/releases/tag/v7.3.7),
[Fetch redirects](https://fetch.spec.whatwg.org/#http-redirect-fetch),
[openapi-fetch](https://openapi-ts.dev/openapi-fetch/api).
