# circleso 1.0.0

Prepared October 27, 2026; stable publication is pending. The published candidate is
`1.0.0-rc.1` at `next`, and `latest` remains `0.3.0`. After stable publication, install
`circleso@1.0.0`. Consult the [changelog](../CHANGELOG.md) and
[migration guide](migration-v1.md) before upgrading from 0.3.0.

## Included in v1

V1 covers all 278 specified operations: 172 Admin V2, 102 Headless Member V1 and four
Headless Auth operations through typed raw clients and named resources. It includes
shared SDK errors, cancellation, body deadlines, bounded retry/refresh behavior,
pagination iterators, direct uploads, rich-text builders and optional usage controls.
The [API reference](api-reference.md) describes contracts and upstream schema limits.

The root, `/admin`, `/headless` and `/auth` exports support ESM and CJS with matching
declarations. Supported Node majors are 22 and 24; the minimum TypeScript version is
5.9.3. The standalone Member client supports browser pages and dedicated workers.
Admin, Auth and built-in token refresh require a server. See [support](../SUPPORT.md).

Stable preparation preserves the accepted candidate's SDK source, generated types,
exports and dependency graph. Only the package version and release documentation change.
The accepted candidate source is
[`007fbbe`](https://github.com/atomimus/circleso/commit/007fbbe2b2413d0124a7aa1312292293237b8728).

## Qualification and limits

The published candidate passed a fresh registry installation, signature and provenance
verification and installed synthetic workflows. Its registry tarball equals the retained
CI artifact byte for byte. Candidate qualification includes strict TypeScript 5.9.3/7.0.2
with Node16, NodeNext and Bundler resolution, ESM/CJS applications, compiled examples,
and Chromium, Firefox and WebKit on Ubuntu. See [candidate notes](release-candidate.md).

Stable bytes require their own clean-install, generation, unit, package, documentation
and browser checks from an immutable source revision. The actual retained artifact records
the full source/tree, CI run/attempt, complete file inventory and tarball SHA-512.
[Publishing](publishing.md) explains how to match the tested and published bytes.

Live Circle behavior remains unverified: no authorized test community was configured.
There was no timed customer-deployment soak. Windows Playwright WebKit cookie isolation
is unqualified; Ubuntu's three-engine matrix is required. Installed Safari, third-party
cookie policies and service/shared workers are outside the exercised browser scope.
See [acceptance](acceptance.md) for precise evidence and exclusions.

Other limits include Circle's missing chat-import success schema, native Fetch Host and
redirect behavior, caller-owned timeout/pagination budgets, no general JSON response-byte
cap and potentially sensitive raw errors. Applications own authorization, token storage,
redacted diagnostics and safe mutation policy. Read [security boundaries](security-review.md).

## Publication and recovery

Stable publication uses the qualified immutable tarball, `v1.0.0` at its exact source,
and npm `1.0.0` at `latest`. Preparation does not create the tag or publish the package.
The existing GitHub Actions trusted publisher is `atomimus/circleso`, `publish.yml`,
environment `npm-release`, with direct publication allowed. The publisher pins hosted
Node 24.22.1/npm 11.19.1, uses OIDC/provenance and publishes once with scripts disabled.

The candidate command succeeded before a stale immediate registry check failed. If that
happens again, inspect registry integrity, tags, signatures and source provenance through
read-only checks before considering any further action. Never repeat a successful publish
to make a workflow green. Preserve the failed workflow and reconciled evidence. Follow
[recovery](publishing.md#recovery); versions cannot be reused and defects need a forward fix.
