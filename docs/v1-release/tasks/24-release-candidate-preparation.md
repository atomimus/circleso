# Task 24 Prepare the release candidate and trusted publishing pipeline

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 24 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 03, 11, 21, 22, 23.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- package.json
- package-lock.json
- CHANGELOG.md
- README.md
- .github/workflows
- docs/v1-release/results

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.npmjs.com/cli/commands/npm-publish
- https://docs.npmjs.com/adding-dist-tags-to-packages

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Re-run all v1 gates from a clean checkout and reconcile live spec sync with committed declarations. Any upstream drift or unresolved defect is a blocker to investigate, not a reason to relax checks.

2. Prepare an available 1.0.0-rc.N version in package/lockfile, candidate release notes, package inventory and a release evidence report naming the exact source revision and tarball digest. Do not overwrite an existing registry version.

3. Implement reviewed, manually gated GitHub Actions publishing with npm trusted publishing/OIDC and provenance where the package/account supports it. Verify current Node/npm and hosted-runner requirements rather than copying obsolete snippets.

4. Use least-privilege workflows, a dedicated release environment without a human approval gate, explicit version/tag/dist-tag checks, concurrency control and an immutable tested source. Prevent ordinary main pushes from publishing and avoid hidden lifecycle regeneration changing the reviewed artifact.

5. Provide setup instructions for npm owner/trusted-publisher configuration and recovery/deprecation procedures. Creating a release/tag or triggering npm publish is outside this preparation task.

## Acceptance and finish

- The release candidate commit is verified on origin/main, package evidence is recorded and all technical gates pass.
- The trusted-publishing workflow is ready but cannot publish merely because a commit is pushed to main.
- Stop with no release tag, prerelease, npm publish or dist-tag change.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/24.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
🔨 chore(release): prepare the v1 release candidate
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #24 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #25's prerequisites pass, immediately create and open a new local circleso chat and start task #25 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/25-release-candidate-publication.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #25 in this chat.
