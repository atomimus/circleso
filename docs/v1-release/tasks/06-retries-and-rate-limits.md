# Task 06 Make retries safe for real SDK request bodies

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 06 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04, 05.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/core/http.ts
- src/core/http.test.ts
- src/clients/shared.ts
- src/api.test.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://fetch.spec.whatwg.org/
- https://streams.spec.whatwg.org/
- https://api.circle.so/apis/admin-api/usage-and-limits
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Reproduce an idempotent Admin PUT with JSON receiving 429 and making only one attempt. Build a bounded replay strategy that works with Requests created by openapi-fetch, without reusing consumed bodies or buffering arbitrary streams indefinitely.

2. Honor numeric and HTTP-date Retry-After, retryable status/network failures, exponential backoff, jitter, cancellation and the timeout budgets from task 4. Validate retry configuration and document precedence/caps.

3. Keep POST/PATCH retries opt-in. Never silently retry payments, refunds, invitations, imports, or other non-idempotent writes. Expose clear behavior for non-replayable bodies and any explicit caller-provided replay mechanism.

4. Cancel superseded response bodies and preserve the final SDK error/cause. Avoid retaining Authorization in telemetry or retry metadata.

5. Test GET and body-bearing PUT/DELETE through public clients, Retry-After dates, exhaustion, cancellation during waiting, non-idempotent defaults and genuinely non-replayable streams.

## Acceptance and finish

- Replayable idempotent requests retry as configured and unsafe writes do not gain automatic retries.
- Retry waiting can be cancelled, all attempts respect documented budgets, and exhaustion retains the correct error context.
- Regression tests use the actual public-client-to-smart-fetch boundary.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/06.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-06-retries-and-rate-limits. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(http): replay safe requests and respect retry budgets
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #06 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #07's prerequisites pass, immediately create and open a new local circleso chat and start task #07 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/07-token-refresh-concurrency.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #07 in this chat.
