# Task 08 Enforce required inputs and correct request serialization

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 08 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 05.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/adminApi/types.ts
- src/headlessApi/types.ts
- src/authApi/types.ts
- src/adminApi/request.ts
- src/headlessApi/request.ts
- src/authApi/request.ts
- src/adminApi/resources/communitySegments.ts
- src/adminApi/resources/accessGroups.ts
- src/core/middleware/adminQuery.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://openapi-ts.dev/openapi-fetch/
- https://spec.openapis.org/oas/v3.0.3.html

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Inventory all required path/query/body inputs and fix the 15 optional-options wrappers where the spec requires query arguments. Add compile-time positive and negative consumer tests instead of relying on structural casts or any.

2. Correct POST operations with query parameters, body-bearing DELETE operations and operations combining query/body data. Segment duplication must put title in its documented location. Required empty JSON objects such as access-group content replacement must serialize as {}.

3. Preserve the established flat-options style where fields are unambiguous. Define explicit, documented handling of overlapping query/body names without silently guessing or renaming existing methods.

4. Reserve and correctly forward request metadata such as headers, signal and explicitly supported fetch credentials; it must never leak into JSON/query fields. Verify array/object serialization, null versus omitted values, encoded path IDs and exactOptionalPropertyTypes.

5. Factor shared request/type helpers where needed while leaving networking/error handling in the core. Retain the member_tag_ids comma-separated rule and verify representative raw and facade behavior.

## Acceptance and finish

- Required inputs fail to compile when omitted and documented valid requests compile across all three surfaces.
- Mixed query/body operations and required empty objects match the official contracts on the wire.
- Public v1 type/serialization changes have migration notes and meaningful tests.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/08.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(requests): enforce typed inputs and schema serialization
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #08 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #09's prerequisites pass, immediately create and open a new local circleso chat and start task #09 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/09-configuration-and-runtime-boundaries.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #09 in this chat.
