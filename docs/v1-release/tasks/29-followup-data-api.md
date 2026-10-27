# Task 29 Follow up with Data API discovery and a scoped client

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the separate post-v1 follow-up track.

Implement only task 29 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 27.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- AGENTS.md
- scripts/spec-sync.ts
- scripts/gen-types.ts
- src/core
- package.json

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/apis/data-api
- https://app.circle.so/data_api/docs

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Obtain and review official Data API contracts, pagination, authentication, access requirements, quotas and export semantics. The public overview alone is not sufficient to implement endpoints.

2. Identify an official machine-readable contract, if one is available, and propose an additive generated-type/client route through the existing architecture. Do not scrape or infer undocumented data endpoints.

3. Implement a separately exported read/analytics client only where authoritative contracts and access are available, with bounded cursor iteration, cancellation and streaming/export behavior as documented.

4. Keep warehouse/ETL orchestration, credential storage and analytics infrastructure outside the SDK. Test against recorded synthetic fixtures/local endpoints and an explicitly authorized read-only test account if provided.

5. When detailed docs or entitlement are unavailable, deliver the source inventory and exact access questions; mark implementation blocked and never represent overview-level research as full support.

## Acceptance and finish

- A contract-backed optional Data client is tested, or a precise access/contract blocker is documented.
- No invented API, silent entitlement assumption or production data extraction is introduced.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/29.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-29-followup-data-api. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(data): add verified Circle Data API support
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #29 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #30's prerequisites pass, immediately create and open a new local circleso chat and start task #30 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/30-followup-admin-v1-decision.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #30 in this chat.
