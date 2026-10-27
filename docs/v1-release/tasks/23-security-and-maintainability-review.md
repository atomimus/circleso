# Task 23 Review security dependencies and release maintainability

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 23 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 21, 22.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src
- scripts
- package.json
- package-lock.json
- .github
- README.md
- CHANGELOG.md
- docs/v1-release

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://docs.github.com/en/actions/reference/security/secure-use
- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/auditing-package-dependencies-for-security-vulnerabilities

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Perform an evidence-led security and correctness review of the final v1 diff and relevant runtime paths, using applicable review skills when available. Review credential destinations, redirects, logging, auth refresh, uploads, cookie handling, queues/cache isolation and untrusted data.

2. Inspect direct/transitive dependencies, licenses and package contents. Fix applicable findings with meaningful regression tests; do not blindly run npm audit fix --force or treat a scanner score as proof of security.

3. Review public API consistency, accidental Node/browser coupling, meaningful performance/memory budgets and type/declaration size. Measure representative workflows instead of inventing zero-overhead claims.

4. Add or complete SECURITY.md, private vulnerability reporting instructions using an existing verified channel, compatibility/support policy and dependency-maintenance procedures. Do not invent an email address or contact maintainers externally.

5. Record reviewed findings, resolutions, residual upstream limitations and release blockers. Any independent review must be explicitly requested before spawning agents.

## Acceptance and finish

- No unresolved release-blocking issue remains in the reviewed supported scope.
- Dependency/security findings have a reasoned disposition and regression evidence.
- Security and maintenance guidance is usable, accurate and included in the release documentation.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/23.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
🔒 security(sdk): close release risks and document support
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #23 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #24's prerequisites pass, immediately create and open a new local circleso chat and start task #24 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/24-release-candidate-preparation.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #24 in this chat.
