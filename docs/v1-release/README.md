# CircleSo v1 release roadmap

This plan prepares circleso for a tested npm 1.0.0 release. It covers the three agreed REST APIs and the reliability, typing, documentation and release work identified in the audit.

There are 29 tasks in this plan. Task 01 was activated on October 27, 2026; see [TASKS.json](TASKS.json) and [its outcome](results/01.md) for current status. Tasks 01 through 27 form the v1 track. Tasks 29 and 30 are the Data API and legacy Admin V1 follow-ups and do not block v1. Task numbers are retained so existing references and launch buttons for surviving tasks remain valid. Creating this plan did not itself start implementation or publication.

The user has authorized automatic completion handoffs: once a task is fully complete, it creates and opens a new local circleso chat and starts the next remaining task listed in TASKS.json. Required technical checks, the commit's presence on origin/main and successor prerequisites must pass first. No human review or merge gate is required. Task 30 ends the chain. Editing these instructions does not start it.

## Start one task

Say **start task #N here** to execute its saved prompt in this chat. Say **open task #N in a new chat** or use the launch actions in the planning chat to create and open a separate local circleso chat.

The selected task checks that its dependencies are integrated and that another task is not writing the shared checkout. If not ready, it reports the specific dependency and stops; it does not start missing work automatically. On full completion it hands off to the next remaining task in TASKS.json in a new chat. Independent tasks can still be selected directly once their listed dependencies are integrated.

Full prompts are linked below. Each contains research sources, exact scope, finish criteria, validation requirements, a suggested commit and a final next-chat handoff instruction. The last task instead ends the chain.

## Execution and integration

Read [WORKFLOW.md](WORKFLOW.md) before any implementation. Work directly on main: verify the contract, implement the bounded change, test it, explicitly stage the task's files, commit and push to origin/main. Do not create separate task branches or pull requests, or wait for human review/merge approval. Do not force-push or overwrite unrelated work.

An outcome is **integrated** when its validated commit is verified on origin/main. That technical integration and the successor's prerequisites enable the completion handoff. Tasks 25 and 27 are dedicated external-publication steps, reached by direct selection or a completed predecessor's handoff; all other tasks stop short of npm publication.

The work aims for verifiable reliability through contracts, regression tests, clean consumer installs and traceable releases. Missing access or unverified checks stay visible rather than being counted as success.

## Task index

### Foundation

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 01 | [Preserve the baseline and define the v1 contract](tasks/01-baseline-and-release-contract.md) | None |
| 02 | [Make spec generation deterministic and measure API coverage](tasks/02-spec-generation-and-coverage.md) | 01 |
| 03 | [Establish CI and the supported runtime matrix](tasks/03-ci-and-runtime-matrix.md) | 01, 02 |

### Reliability and compatibility

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 04 | [Fix cancellation and response body timeouts](tasks/04-cancellation-and-timeouts.md) | 03 |
| 05 | [Unify response parsing and SDK error guarantees](tasks/05-response-parsing-and-errors.md) | 04 |
| 06 | [Make retries safe for real SDK request bodies](tasks/06-retries-and-rate-limits.md) | 04, 05 |
| 07 | [Complete token refresh concurrency and failure handling](tasks/07-token-refresh-concurrency.md) | 04, 05, 06 |
| 08 | [Enforce required inputs and correct request serialization](tasks/08-request-types-and-serialization.md) | 02, 05 |
| 09 | [Finish configuration validation and server browser boundaries](tasks/09-configuration-and-runtime-boundaries.md) | 04, 05, 08 |
| 10 | [Make logging safe and reliable for all response shapes](tasks/10-logging-and-secret-redaction.md) | 05, 09 |
| 11 | [Fix npm exports and prove clean consumer compatibility](tasks/11-npm-exports-and-consumer-compatibility.md) | 03, 08, 09, 10 |

### API completeness and workflows

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 12 | [Add Admin charge and subscription resources](tasks/12-admin-charges-and-subscriptions.md) | 02, 05, 08 |
| 13 | [Add Admin paywall and affiliate resources](tasks/13-admin-paywalls-and-affiliates.md) | 12 |
| 14 | [Add Admin workflow and directory filter resources](tasks/14-admin-workflows-and-filters.md) | 02, 05, 08 |
| 15 | [Complete the remaining Admin resource coverage](tasks/15-remaining-admin-resources.md) | 02, 05, 08, 09 |
| 16 | [Complete bounded pagination and typed iterators](tasks/16-pagination-and-iterators.md) | 04, 05, 07, 08 |
| 17 | [Add the complete direct upload workflow](tasks/17-complete-file-upload-workflow.md) | 04, 05, 06, 08, 09, 10 |
| 18 | [Add documented rich text types and builders](tasks/18-rich-text-builders.md) | 02, 08 |
| 19 | [Complete authentication and cookie integration recipes](tasks/19-auth-and-cookie-integration.md) | 07, 08, 09, 10 |
| 20 | [Add optional usage controls without changing safe defaults](tasks/20-usage-controls.md) | 04, 05, 06, 07, 09, 10 |

### Documentation and release qualification

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 21 | [Write the complete v1 API reference and migration guide](tasks/21-public-documentation-and-migration.md) | 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 |
| 22 | [Prove browser and integration behavior with acceptance tests](tasks/22-browser-and-integration-acceptance.md) | 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20 |
| 23 | [Review security dependencies and release maintainability](tasks/23-security-and-maintainability-review.md) | 21, 22 |
| 24 | [Prepare the release candidate and trusted publishing pipeline](tasks/24-release-candidate-preparation.md) | 02, 03, 11, 21, 22, 23 |

### Release candidate and stable publication

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 25 | [Publish and validate the v1 release candidate](tasks/25-release-candidate-publication.md) | 24 |
| 26 | [Prepare the final v1 release decision and version commit](tasks/26-stable-release-preparation.md) | 25 |
| 27 | [Publish circleso 1.0.0 and verify consumer installations](tasks/27-publish-v1-and-verify.md) | 26 |

### Separate follow up integrations

| Task | Prompt and outcome | Dependencies |
| --- | --- | --- |
| 29 | [Follow up with Data API discovery and a scoped client](tasks/29-followup-data-api.md) | 27 |
| 30 | [Follow up with a legacy Admin V1 support decision](tasks/30-followup-admin-v1-decision.md) | 27 |

WebSockets, Circle MCP/webhook integrations and Circle Plus mobile helpers have been removed from this plan. IDs 28, 31 and 32 are retired and must not be launched or reused. Automatic handoff follows 27 → 29 → 30 and then stops.

## V1 release gates

Before candidate preparation, all applicable implementation tasks must be integrated and their tests must pass. In particular:

- Every current supported operation is exposed by a typed raw client and a named resource, except clearly documented authoritative schema limitations.
- Cancellation, body timeouts, retries, refresh concurrency, response parsing, error context and logging have regression coverage through public clients.
- Required parameters and query/body serialization are correct and compile-time contracts are exercised.
- All published entry points work from a clean npm tarball in the agreed Node, browser, ESM/CJS and TypeScript consumers.
- Examples compile, migration notes match the actual diff, and no unresolved release-blocking security/correctness issue remains.
- Spec refresh/regeneration is reviewed and deterministic; the released artifact is traced to immutable accepted source.
- Passing CI, trusted publishing, provenance and candidate installation evidence are ready before stable publication.

Task 24 prepares an RC and workflow without tagging/publishing. Task 25 publishes/verifies an RC under a prerelease tag. Task 26 commits and pushes the stable version directly to main without publishing. Task 27 publishes/verifies 1.0.0 and latest after that exact source and its technical gates are verified.

## Audit coverage and planning files

- [AUDIT.md](AUDIT.md) maps every audited gap to an owning task.
- [WORKFLOW.md](WORKFLOW.md) defines activation, research, validation, direct main commits and publication rules.
- [CONTRACT.md](CONTRACT.md) defines the v1 public API, errors, compatibility and runtime support targets.
- [TASKS.json](TASKS.json) is the machine-readable ID/dependency/status registry. Every initial status was planned; results record subsequent execution.
- [SOURCES.md](SOURCES.md) lists primary research starting points.
- Future task outcomes belong in results/NN.md and must distinguish verified, skipped and externally blocked checks.

The initial inventory is 172 Admin, 102 Member and 4 Auth operations, with 47 Admin facade gaps. It will be recomputed rather than frozen if Circle's specs change.

The existing untracked examples/admin-get-space-member.js is protected user work. Task 01 handles the current uncommitted API-refresh checkpoint and the ignored AGENTS.md deliberately. No implementation task has been run by writing these documents.
