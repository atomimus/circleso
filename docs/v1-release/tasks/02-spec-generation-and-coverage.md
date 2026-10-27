# Task 02 Make spec generation deterministic and measure API coverage

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 02 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 01.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- scripts/spec-sync.ts
- scripts/spec-sync.mjs
- scripts/gen-types.ts
- scripts/spec-overrides.ts
- scripts/spec-overrides.test.ts
- api/specs/sources.json
- src/generated/index.ts
- src/adminApi/resources
- src/headlessApi/resources
- src/authApi/resources

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://openapi-ts.dev/

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Verify every configured spec source with Circle's current official documentation. Consolidate duplicate sync configuration/scripts while preserving useful public npm commands and keeping downloaded specs pristine.

2. Validate downloads and atomic replacement, useful failure diagnostics, temporary-file cleanup, and repeatable generation from committed specs. Avoid network access during ordinary consumer installation or normal offline builds.

3. Retain a narrowly tested override for the missing admin_v2_chat_room_message response only while the official schema is absent. It must yield unknown, automatically defer to a supplied official definition, and continue rejecting unrelated unresolved references.

4. Add a reproducible operation-to-wrapper inventory and an offline drift check. Separate raw route exposure, named facade coverage, and intentionally untyped schema limitations. Capture the 47 currently raw-only Admin operations as actionable inventory.

5. Provide a deliberate live spec-refresh check that reports a reviewable diff without silently modifying dependencies, publishing, or accepting upstream breaking changes.

## Acceptance and finish

- Repeated generation is byte-for-byte identical, and an offline check detects stale generated files.
- A command produces accurate method/path coverage and the remaining Admin gap list.
- Generation failures preserve prior outputs and clean temporary files; focused fixtures cover the override and a future upstream fix.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/02.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-02-spec-generation-and-coverage. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
🔨 chore(specs): validate regeneration and track endpoint coverage
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #02 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #03's prerequisites pass, immediately create and open a new local circleso chat and start task #03 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/03-ci-and-runtime-matrix.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #03 in this chat.
