# Task 30 Follow up with a legacy Admin V1 support decision

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the separate post-v1 follow-up track.

Implement only task 30 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final chain-ending instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 27.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- AGENTS.md
- src/adminApi
- README.md
- CHANGELOG.md
- package.json

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/apis/admin-api
- https://api-v1.circle.so/

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Read the current official legacy API reference and Circle's V2 migration guidance. Compare real V1-only use cases with the v1 library's V2 coverage rather than assuming another client is necessary.

2. Produce a verified endpoint/use-case matrix, migration alternatives, supported-contract availability and maintenance cost. Never confuse Circle Admin API V1 with circleso package version 1.

3. Recommend either keeping V2-only support with a migration guide or an explicitly scoped isolated legacy adapter. No legacy implementation is authorized by this research task alone.

4. If a legacy adapter is justified, provide a separate implementation prompt with authoritative types/contracts, exports, tests, deprecation policy and a scope decision for the user.

5. Preserve the existing three-surface mission until that follow-up scope is explicitly accepted.

## Acceptance and finish

- A concrete sourced support decision and migration/use-case matrix are committed and pushed directly to origin/main.
- This task stops at the decision and does not silently build or publish a legacy API client.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/30.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
📚 docs(legacy): define the Admin V1 compatibility decision
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #30 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, report final completion and stop: task #30 is the last planned task, so do not recreate a removed task or create another successor chat.
