# circleso 1.0.0

Published October 27, 2026: [npm 1.0.0](https://www.npmjs.com/package/circleso/v/1.0.0)
is at `latest`; `next` remains `1.0.0-rc.1`. Install `circleso@1.0.0`.
See the [immutable GitHub release](https://github.com/atomimus/circleso/releases/tag/v1.0.0), [changelog](../CHANGELOG.md) and
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

Stable source
[`43c4cdd`](https://github.com/atomimus/circleso/commit/43c4cdd3e7a88dc2ef3d48d68b8f14b391c12975)
passed all six jobs and every step in
[Offline CI](https://github.com/atomimus/circleso/actions/runs/40489845981), including
1,194 tests per Node target and 27 browser tests per Ubuntu Node target. The publishing
qualification repeated installed consumers and all three browser engines on the retained bytes.

Fresh registry installs passed runtime workflows, all eight ESM/CJS entries, six strict
compiler/resolution pairs, 12 compiled ESM/CJS applications, 31 documentation TypeScript
blocks and 11 examples per compiler. Post-publication Windows Chromium/Firefox passed
18/18 browser tests. npm verified three registry signatures and the package attestation;
both signed subjects, source and workflow invocation match the downloaded package.

The registry tarball equals retained CI artifact `12727801021` byte for byte: 60 files,
1,128,212 compressed bytes; SHA-256
`6fd283015031edb7320c81754f3a569013d256a1ad2314b49bbb1d22f49b36e4`.
Its SHA-512 integrity is
`sha512-DacdrFpvVvO2rUYP6aDMNyvJdF91zBqU0CdU/KlUTAJkEONZxRR7zIuKSavnKcXTaQxOPkr7BLau7mZRzA5ZYw==`.
[Publishing](publishing.md) explains how to verify the artifact, signatures and provenance.

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

Stable publication used the qualified tarball, `v1.0.0` at its exact source,
and npm `1.0.0` at `latest`. The published GitHub release locks its tag against changes.
The existing GitHub Actions trusted publisher is `atomimus/circleso`, `publish.yml`,
environment `npm-release`, with direct publication allowed. The publisher pins hosted
Node 24.22.1/npm 11.19.1, uses OIDC/provenance and publishes once with scripts disabled.

The stable command succeeded in
[publishing run 40490961461](https://github.com/atomimus/circleso/actions/runs/40490961461),
attempt 1, before a stale immediate registry check failed. The workflow remains failed;
read-only reconciliation verified registry integrity, tags, installed signatures and exact
source provenance. No publication was repeated. For future uncertain outcomes, inspect these
postconditions before any further action. Never repeat a successful publish to make a
workflow green. Preserve the failed workflow and reconciled evidence. Follow
[recovery](publishing.md#recovery); versions cannot be reused and defects need a forward fix.
