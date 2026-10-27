# 1.0.0-rc.1 candidate notes

Prepared October 27, 2026. This version is not yet published. The registry's current
`latest` remains 0.3.0. Read the [migration guide](migration-v1.md) and
[changelog](../CHANGELOG.md) before adopting the candidate.

This candidate covers 172 Admin V2, 102 Headless Member V1 and four Headless Auth operations
through typed raw clients and named resources. It retains the four public package entries,
ESM/CJS formats, shared error constructors, bounded iterators, upload helpers, rich text and
opt-in usage controls. Node 22/24 and TypeScript 5.9.3/7.0.2 are the qualified compiler/runtime
targets. Browser use is limited to the standalone Member client with server-managed credentials.

The deliberate official spec refresh accepts German community locale and the Admin event
invitation clarification. A 201 event response does not prove invitations succeeded; attendee
lists exclude pending invitations. Member/Auth inputs are unchanged. Operation counts are
exposure evidence; see [API coverage](api-coverage.md) and [API limitations](api-reference.md).

The package inventory and immutable source SHA/tree/tarball SHA-512 are emitted with the
actual CI artifact, using the [publishing procedure](publishing.md). Inventory includes
runtime bundles/maps, declarations, package metadata, license and public documentation.
Specs, tests, scripts, private planning and examples are excluded from the package.

Known limits remain: missing upstream chat-import success schema, native Fetch Host/redirect
behavior, caller-owned timeouts/pagination limits, no general JSON byte cap, sensitive raw
errors, and no live Circle qualification. Ubuntu browser engines are the mandatory browser
matrix; Windows Playwright WebKit cookie isolation is unqualified. See
[acceptance evidence and limits](acceptance.md), [support](../SUPPORT.md) and
[security boundaries](security-review.md). No installed Safari or universal deployment-cookie
claim is made.

Candidate publication must use `next`, preserve `latest`, verify installed registry consumers
and attestations, and record concrete soak/rollout findings before a stable decision. A failing
candidate requires a forward fix and new unused RC version. Preparation creates no release,
tag, publication or dist-tag change.
