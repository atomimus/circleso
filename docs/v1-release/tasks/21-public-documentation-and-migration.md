# Task 21 Write the complete v1 API reference and migration guide

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 21 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 11, 12, 13, 14, 15, 16, 17, 18, 19, 20.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- README.md
- CHANGELOG.md
- examples
- src/index.ts
- src/adminApi/index.ts
- src/headlessApi/index.ts
- src/authApi/index.ts
- docs/v1-release

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/llms.txt
- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://api.circle.so/apis/headless/quick-start
- https://api.circle.so/apis/admin-api/usage-and-limits

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Document installation, runtime/TypeScript support, every export/resource family, raw versus facade semantics, required options, pagination, error/cause handling, retry safety, deadlines, logging and extension policies.

2. Write a precise migration guide from published 0.3.0 to v1, covering upstream removed/moved fields, runtime support, stricter inputs, new helpers, exports and actual breaking changes.

3. Provide complete auth, file upload, rich text, cookie and common member/admin examples. Use environment-driven credentials, no real identifiers/secrets, and safe defaults.

4. Add permanent checks that compile every TypeScript README/reference example against the built package and run suitable local examples against fixtures. Check links and package inclusion.

5. Add CONTRIBUTING, support/compatibility and release-maintenance guidance. Clearly distinguish supported APIs, known upstream typing gaps, optional policies and the separate future integration track.

## Acceptance and finish

- A new consumer can install and follow complete examples without relying on chat history.
- All code examples compile automatically against the package's real entry points.
- The migration and API inventory accurately describe the final implementation.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/21.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
📚 docs(sdk): document the v1 contract and migration
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #21 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #22's prerequisites pass, immediately create and open a new local circleso chat and start task #22 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/22-browser-and-integration-acceptance.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #22 in this chat.
