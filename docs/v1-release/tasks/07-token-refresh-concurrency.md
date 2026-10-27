# Task 07 Complete token refresh concurrency and failure handling

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 07 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04, 05, 06.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/core/tokenManager.ts
- src/core/tokenManager.test.ts
- src/clients/headlessClient.ts
- src/core/middleware/bearerAuth.ts
- src/authApi/resources

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://api.circle.so/apis/headless
- https://api.circle.so/apis/headless/quick-start

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Verify current token expiry, refresh and revoke contracts against Circle's Auth spec. Preserve caller-owned secret storage and existing getAccessToken/setAccessToken hooks.

2. Test and implement one refresh for concurrent failures of the same token generation, including a late old-token 401 arriving after the first refresh finishes. Reuse a newer token instead of refreshing again unnecessarily.

3. Classify documented expired/unauthorized responses carefully; do not treat every permission-related 403 as token expiry. Retry each original request once after refresh, preserving method, body, headers, cancellation and request context.

4. On refresh HTTP failure or malformed refresh response, surface a contextual SDK error for the refresh call and do not loop. Handle network, timeout, setter/getter failures and cancelled waiters without breaking other waiters or leaking raw exceptions.

5. Add single-flight, late-response, repeated unauthorized retry, refresh failure fan-out, token-hook and cancellation tests at the public Headless client boundary.

## Acceptance and finish

- Concurrent and staggered failures of one expired token avoid duplicate refresh work.
- Original requests retry at most once after refresh and failures do not form loops.
- Tests explicitly cover the concurrency requirement in AGENTS.md and preserve refresh-call context.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/07.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(auth): prevent duplicate refreshes and retry loops
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #07 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #08's prerequisites pass, immediately create and open a new local circleso chat and start task #08 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/08-request-types-and-serialization.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #08 in this chat.
