# CircleSo v1 audit baseline

This records the evidence used to create the release task plan on October 27, 2026. Reproduce relevant cases against the current tree when their task starts; these are implementation observations, not guarantees that the code has stayed unchanged.

## Scope and release state

- Supported REST specs: Admin V2, Headless Member V1 and Headless Auth.
- Local package and published npm metadata observed: 0.3.0; registry last modified December 31, 2025.
- Existing API-refresh work is uncommitted on main. It is not an npm release.
- User decision: ship these three APIs as v1, retaining only Data API and legacy Admin V1 as separate follow-ups. WebSocket, Circle MCP/webhook and Circle Plus mobile tasks are excluded by the updated scope.
- At the latest validation, 40 tests and typecheck passed. ESM/CJS runtime builds, README compilation and npm package dry-run were checked, but a CJS TypeScript consumer still failed.

## Operation coverage

| Surface | Spec operations | Raw exposure | Named facade operations |
| --- | ---: | ---: | ---: |
| Admin V2 | 172 | 172 | 125 |
| Headless Member V1 | 102 | 102 | 102 |
| Headless Auth | 4 | 4 | 4 |
| Total | 278 | 278 | 231 |

Counts are method/path inventory, not test or behavioral coverage. Recompute after a spec refresh.

The 47 raw-only Admin operations are owned by tasks 12 through 15:

| Group | Count | Task |
| --- | ---: | --- |
| Member charges and subscriptions | 8 | 12 |
| Paywalls, groups, coupons, affiliates and payouts | 15 | 13 |
| Workflows and directory-filter configuration/controls | 11 | 14 |
| Leads, notes, settings, live rooms/transcripts, locations and chat import | 13 | 15 |

## Reproduced gaps and task ownership

| Observation | Owner |
| --- | --- |
| A pre-aborted signal passed through a public Member resource arrived at fetch as not aborted | 04 |
| A response body completed roughly 48 ms later despite timeoutMs 5 after immediate headers | 04 |
| Empty-body HTTP 400 returned undefined; plain-text/malformed-JSON error details were lost | 05 |
| Malformed JSON in a successful response threw SyntaxError; the chat iterator threw a plain Object | 05 |
| An Admin JSON PUT receiving 429 made one attempt with one retry configured | 06 |
| Two failures from the same old token, one arriving after refresh completed, caused two refresh calls | 07 |
| Fifteen facade methods made options optional despite required query parameters | 08 |
| Segment duplicate title was serialized in JSON rather than its documented query location | 08 |
| Access-group content update with an empty options object sent no body rather than required JSON {} | 08 |
| communityHost rewrote the default network base URL, contrary to the stated configuration contract | 09 |
| logBodies true on HTTP 204 threw TypeError from Response construction | 10 |
| A .cts consumer with Node16 resolution reported TS1479, while ESM consumer typing passed | 11 |

Task 07 also owns careful 403 refresh classification. Task 09 owns browser-worker detection, input validation and the documentation/spec disagreement around Admin authentication. Task 10 owns secret-redaction and callback-context review.

## Other incomplete work

- Spec integrity, generated drift and facade coverage automation: 02.
- Maintained Node support, CI reproducibility and required checks: 01, 03, 11.
- Full bounded pagination, search_after and typed resource iterator coverage: 16.
- Complete upload registration/checksum/storage workflow: 17.
- Documented rich-text builders without UI components: 18.
- Application-token/member-token/cookie integration recipes: 19.
- Optional bounded usage controls and safe caller-owned caching policies: 20.
- Full API reference, migration guidance and permanent example compilation: 21.
- Real browser/packaged-consumer acceptance and opt-in test-community integration: 22.
- Security/dependency review, support guidance and measured release risks: 23.
- Trusted publishing setup, release candidate and stable release evidence/publication: 24 through 27.
- Circle's missing admin_v2_chat_room_message response schema must remain unknown until an authoritative schema exists: 02 and 15.

## Existing work to preserve

The working tree already contains the October API spec/type refresh, eleven additional methods within existing resources, query/body fixes, new contract tests, the missing-schema generation workaround and README/changelog updates. Task 01 reviews/checkpoints these changes rather than restarting them.

The user-owned untracked examples/admin-get-space-member.js must not be staged, overwritten, printed for its possible credentials or treated as task-owned without explicit inclusion. AGENTS.md is currently ignored and untracked; task 01 makes the reviewed repository guidance durable.

## Primary sources

- [Circle documentation index](https://api.circle.so/llms.txt)
- [Admin V2 specification](https://api-headless.circle.so/api/admin/v2/swagger.yaml)
- [Headless Member specification](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml)
- [Headless Auth specification](https://api-headless.circle.so/api/headless_auth/swagger.yaml)
- [Circle rate limits](https://api.circle.so/apis/admin-api/usage-and-limits)
- [Member cursor pagination](https://api.circle.so/apis/headless/member-api/community-member-search)
- [Upload workflow](https://api.circle.so/get-started/concepts/file-uploads)
- [Auth token workflow](https://api.circle.so/apis/headless/quick-start)
- [Cookie integration](https://api.circle.so/apis/headless/member-api/cookies)

Circle's Admin quick-start shows Bearer while the downloaded Admin spec and AGENTS.md specify Token. Task 09 must resolve/document the distinction using official evidence; this audit does not authorize guessing a header change.
