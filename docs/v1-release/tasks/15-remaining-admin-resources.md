# Task 15 Complete the remaining Admin resource coverage

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 15 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 05, 08, 09.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/adminApi/index.ts
- src/adminApi/resources
- src/generated/admin-v2.d.ts
- scripts/spec-overrides.ts
- api/specs/admin-v2.yaml

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api.circle.so/apis/admin-api

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Implement the remaining 13 operations from the audited inventory: leads create/delete, contact notes list/create, payment-method preferences get, tax get/update, Connect settings get/update, live rooms/transcripts reads, location search and chat-room-message import.

2. Follow current module, export, JSDoc and requester conventions. Verify precise paths, verbs and request field names from the current spec rather than the old audit counts if upstream changed.

3. Keep the chat import response unknown while its schema is absent; retain the generation workaround and expose this limitation in the API reference. Do not substitute a guessed Headless chat-message response.

4. Test representative request/response/error contracts and compile-time required inputs. Imports, lead deletion and settings updates use mocked fetch; no customer data or messages are changed.

5. Reconcile the full Admin coverage inventory with tasks 12-14. Every current supported Admin operation must be wrapped or have a precise documented upstream blocker.

## Acceptance and finish

- The complete Admin inventory has no accidental facade gaps; the expected baseline is 172/172.
- Headless remains 102/102 and Auth 4/4 unless a reviewed upstream change alters the counts.
- The missing import response is accurately documented as untyped rather than claimed fully typed.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/15.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-15-remaining-admin-resources. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(admin): complete remaining Admin resource coverage
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #15 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #16's prerequisites pass, immediately create and open a new local circleso chat and start task #16 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/16-pagination-and-iterators.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #16 in this chat.
