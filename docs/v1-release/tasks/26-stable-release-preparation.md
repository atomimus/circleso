# Task 26 Prepare the final v1 release decision and version commit

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 26 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 25.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- docs/v1-release/results/24.md
- docs/v1-release/results/25.md
- docs/v1-release/TASKS.json
- package.json
- package-lock.json
- CHANGELOG.md
- README.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/about-semantic-versioning
- https://docs.npmjs.com/cli/commands/npm-pack

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Review actual candidate installation/acceptance evidence and all blocking issues. Complete any agreed candidate observation criteria; lack of reported issues alone is not validation.

2. Prepare version 1.0.0 and matching lockfile/changelog/release notes. Confirm the source differs from the accepted candidate only by reviewed changes and rerun affected validation.

3. Perform a clean-install, offline regeneration, lint/typecheck/test/build/example/package/browser matrix and the deliberate live spec drift check. Keep unverified optional live checks labeled accurately.

4. Create an exact stable release report including source revision, expected package files, consumer checks, current upstream limitations, version/tag/dist-tag values, trusted-publisher setup and recovery instructions.

5. Commit/push the version change for human review. Do not create v1.0.0, publish a GitHub release, publish npm, or move latest here; task 27 is the explicit publication boundary.

## Acceptance and finish

- The stable version PR is green, reviewable and contains complete release evidence.
- All mandatory v1 tasks have integrated outcomes and no unresolved release blocker.
- Stop before tagging or publication so the user can review the concrete 1.0.0 result.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/26.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-26-stable-release-preparation. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
🔨 chore(release): prepare circleso 1.0.0
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #26 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #27's prerequisites pass, immediately create and open a new local circleso chat and start task #27 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/27-publish-v1-and-verify.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #27 in this chat.
