# Task 01 Preserve the baseline and define the v1 contract

Status: activated October 27, 2026. See [the task outcome](../results/01.md) and TASKS.json for current execution and integration evidence.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 01 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: none; this is the baseline task.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- AGENTS.md
- README.md
- CHANGELOG.md
- package.json
- package-lock.json
- .gitignore
- docs/v1-release/AUDIT.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/llms.txt
- https://nodejs.org/en/about/previous-releases
- https://docs.npmjs.com/about-semantic-versioning

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Reconcile the existing uncommitted API refresh against git diff and the audit. Preserve all current work; explicitly exclude the user-owned untracked examples/admin-get-space-member.js unless the user separately includes it. Check task-owned files for secrets without printing values.

2. Record the initial source revision, endpoint inventory (currently 172 Admin, 102 Member, 4 Auth), known failing scenarios, and published-versus-local status. Reproduce the existing test/typecheck/build baseline and record failures truthfully.

3. Define the v1 public contract, stable exports and error semantics, release boundaries, and supported Node/TypeScript/browser matrix. Prefer a maintained Node LTS baseline for v1; verify current support dates rather than retaining EOL Node 18 silently. Record the decision before later engine changes.

4. Make the repository guidance durable: AGENTS.md is currently ignored and untracked. Review it for publication, preserve its architectural and security rules, and track it deliberately rather than force-adding unrelated ignored files.

5. Checkpoint the reviewed, already-authorized API refresh plus planning/governance documents directly on main. Do not implement the later fixes. Add clear contributing, compatibility, and task-result conventions.

## Acceptance and finish

- A reviewed baseline and support contract exist; known failures are recorded rather than presented as passing.
- Existing SDK changes and the roadmap have a recoverable Git checkpoint; protected user files are untouched.
- The scoped baseline commit is verified on origin/main; perform the task 2 handoff after applicable checks and all completion gates finish.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/01.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
📚 docs(release): establish the v1 baseline and support contract
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #01 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #02's prerequisites pass, immediately create and open a new local circleso chat and start task #02 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/02-spec-generation-and-coverage.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #02 in this chat.
