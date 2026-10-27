# Task 11 Fix npm exports and prove clean consumer compatibility

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 11 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 03, 08, 09, 10.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- package.json
- package-lock.json
- tsup.config.ts
- tsconfig.json
- src/index.ts
- src/admin.ts
- src/headless.ts
- src/auth.ts
- src/generated/index.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://nodejs.org/api/packages.html
- https://www.typescriptlang.org/docs/handbook/modules/reference.html
- https://docs.npmjs.com/cli/commands/npm-pack
- https://nodejs.org/en/about/previous-releases

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Reproduce TS1479 in a CommonJS .cts consumer using Node16 resolution. Add conditional import/require types pointing at the correct .d.ts/.d.cts outputs for every supported entry point.

2. Build and pack the library, install the actual tarball into isolated consumer fixtures, and verify ESM imports, CJS require, declaration resolution, minimum/current TypeScript versions and Node16/NodeNext/Bundler resolution as appropriate.

3. Verify all root/subpath exports, declaration dependencies, source maps, package allowlist, license, README and changelog. No dev-only dependency, planning file, test credential or private artifact may be required or shipped accidentally.

4. Apply the runtime support contract from task 1 to engines, build target and CI; document the major-version compatibility change rather than retaining a misleading Node 18 claim.

5. Add browser bundling/tree-shaking checks for Member-facing entry points and regression checks for accidental Node-only imports. Keep the dependency surface small and justified.

## Acceptance and finish

- A clean npm tarball installs and executes in all declared ESM/CJS and TypeScript consumer fixtures.
- TS1479 is fixed through correct package metadata rather than consumer workarounds.
- CI verifies the packaged artifact, not just the repository source tree.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/11.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
📦 build(exports): validate ESM CJS and TypeScript consumers
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #11 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #12's prerequisites pass, immediately create and open a new local circleso chat and start task #12 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/12-admin-charges-and-subscriptions.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #12 in this chat.
