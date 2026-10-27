# Task 03 Establish CI and the supported runtime matrix

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 03 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 01, 02.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- package.json
- package-lock.json
- vitest.config.ts
- tsconfig.json
- biome.json
- tsup.config.ts
- docs/v1-release/results/01.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://nodejs.org/en/about/previous-releases
- https://vitest.dev/guide/
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.github.com/en/actions/how-tos/use-cases-and-examples/building-and-testing/building-and-testing-nodejs

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Implement CI for direct pushes to main using npm ci and the agreed supported Node versions. Cover Linux across the runtime matrix and representative Windows/macOS jobs without an unnecessarily large Cartesian matrix.

2. Run repository lint, typecheck, meaningful tests, offline generated-type drift checks, build, and package dry-run checks. Fix task-owned baseline tooling issues; do not suppress failing functionality or add tests that merely duplicate code.

3. Use least-privilege permissions, reviewed action versions pinned according to GitHub guidance, bounded jobs and concurrency cancellation. Untrusted code and public validation jobs must not receive publish credentials or protected integration secrets.

4. Separate public offline checks from explicit live-spec and integration jobs. No workflow created here may publish or create release tags.

5. Provide documented local commands equivalent to CI. Later tasks must extend these checks when they add browser, type-consumer, security, and package acceptance coverage.

## Acceptance and finish

- CI runs the declared checks on the task's pushed commit and reports genuine results.
- Local and CI commands use the lockfile and agreed runtime policy; normal CI requires no Circle credentials.
- No publishing path is enabled by this task; finish with passing validation and the commit verified on origin/main.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/03.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
👷 ci(validation): add reproducible SDK validation
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #03 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #04's prerequisites pass, immediately create and open a new local circleso chat and start task #04 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/04-cancellation-and-timeouts.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #04 in this chat.
