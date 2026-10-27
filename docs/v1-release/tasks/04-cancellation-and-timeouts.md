# Task 04 Fix cancellation and response body timeouts

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 04 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 03.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/core/http.ts
- src/core/http.test.ts
- src/clients/shared.ts
- src/clients/headlessClient.ts
- src/core/errors.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://fetch.spec.whatwg.org/
- https://streams.spec.whatwg.org/
- https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Reproduce the dropped AbortSignal using a public resource call. Compose Request.signal and per-call signals with the configured timeout; an already-aborted call must not reach the fetch boundary.

2. Specify and implement documented timeout behavior across header arrival, body consumption, and retry waiting, including per-attempt versus total budgets. Ensure body reads used by the SDK remain bounded; document ownership for callers consuming raw streams.

3. Make timeout and caller cancellation distinguishable through the existing SDK error classes, preserving original causes. Release timers, abort listeners, and response bodies on success, failure, early cancellation and iterator disposal.

4. Keep all network lifetime behavior in the core. Avoid separate client-specific timeout wrappers, unbounded buffers, or timing-sensitive tests.

5. Add public-client regression tests with controlled timers and slow/stalled body streams, plus cancellation during requests and backoff.

## Acceptance and finish

- Pre-aborted and mid-flight cancellation work through Admin, Headless and Auth clients.
- A stalled response body cannot bypass the documented timeout contract.
- Tests prove cleanup, error identity/cause and bounded waiting without flaky wall-clock assumptions.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/04.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(http): honor cancellation and bound response processing
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #04 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #05's prerequisites pass, immediately create and open a new local circleso chat and start task #05 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/05-response-parsing-and-errors.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #05 in this chat.
