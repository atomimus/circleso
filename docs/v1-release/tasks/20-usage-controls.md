# Task 20 Add optional usage controls without changing safe defaults

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 20 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04, 05, 06, 07, 09, 10.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/core/http.ts
- src/clients/shared.ts
- src/core/middleware
- src/core/tokenManager.ts
- README.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/apis/admin-api/usage-and-limits
- https://api.circle.so/apis/admin-api/usage-and-limits/optimizing-usage
- https://api.circle.so/apis/admin-api/usage-and-limits/best-practices
- https://fetch.spec.whatwg.org/

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Design minimal opt-in concurrency/rate-budget and circuit-breaker controls, or explicit extension hooks where application-owned policy is safer. Avoid a heavy scheduler framework or hidden global state.

2. Coordinate local retry and request budgets without treating Circle's mutable IP-wide limit as a guaranteed per-client quota. Requests and queued waiters must respect cancellation and deadlines.

3. Add an optional caller-owned read-cache interface or a complete safe recipe, with concrete rules for member/community/auth isolation, cacheability and invalidation. Never cache mutations, auth/cookie responses or Set-Cookie responses by default.

4. Ensure queue limits, circuit transitions, cache keys and metrics cannot expose credentials or leak data across clients. No cache or request sharing is enabled implicitly.

5. Test bounded queues, cancellation, circuit half-open behavior, retry interaction, isolated users and cache invalidation. Document the smallest supported policy surface and its operational limits.

## Acceptance and finish

- Consumers can bound load and repeated failures using explicit, tested policies.
- Default request semantics and safe retry behavior remain unchanged.
- Cross-user/community isolation and bounded resource usage are verified.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/20.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(http): add opt-in request usage controls
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #20 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #21's prerequisites pass, immediately create and open a new local circleso chat and start task #21 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/21-public-documentation-and-migration.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #21 in this chat.
