# Task 12 Add Admin charge and subscription resources

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 12 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 05, 08.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/adminApi/index.ts
- src/adminApi/resources
- src/adminApi/types.ts
- src/generated/admin-v2.d.ts
- api/specs/admin-v2.yaml

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api.circle.so/apis/admin-api

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Re-inventory the current spec and implement the eight currently raw-only operations: charge list/export/refund and subscription list/export/cancel/resume/billing-date changes, including documented trial-extension behavior.

2. Use existing createResource/requester conventions, generated request/response types, stable ID naming and flat options. Verify each exact method/path and request field from the official schema before coding.

3. Keep all retries, parsing, auth and timeout behavior in existing shared layers. Financial mutations must retain safe non-idempotent retry defaults.

4. Write transport-boundary tests for representative reads, exports and mutation payloads, required inputs, nullable fields and contextual failures. All financial writes must be mocked; do not issue live refunds or billing changes.

5. Export and document the new resources and regenerate the coverage inventory. Avoid filling undocumented response shapes with invented interfaces.

## Acceptance and finish

- All eight operations have typed facade methods and the coverage gap decreases accordingly.
- Tests verify the financial mutation wire contracts and lack of automatic unsafe retry.
- Examples compile and the task stops at a passing, pushed PR.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/12.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-12-admin-charges-and-subscriptions. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(admin): add charge and subscription resources
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #12 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #13's prerequisites pass, immediately create and open a new local circleso chat and start task #13 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/13-admin-paywalls-and-affiliates.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #13 in this chat.
