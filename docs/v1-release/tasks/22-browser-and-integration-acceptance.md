# Task 22 Prove browser and integration behavior with acceptance tests

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 22 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20.

Verify the checkout is main and inspect status, staged diff and dependency commits/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- vitest.config.ts
- src/api.test.ts
- src/core
- examples
- .github/workflows
- package.json
- docs/v1-release

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://fetch.spec.whatwg.org/
- https://vitest.dev/guide/
- https://playwright.dev/docs/intro
- https://api.circle.so/apis/headless/member-api/cookies
- https://nodejs.org/en/about/previous-releases

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Add real-browser acceptance tests for supported Member client workflows, worker/browser Admin rejection, bundling, auth/cancellation, uploads and supported cookie mechanics using local controllable HTTP fixtures.

2. Use the packed npm artifact in representative Node ESM/CJS applications across the declared runtime/TypeScript matrix. Test end-to-end composition rather than every wrapper's implementation detail.

3. Add opt-in Circle integration tests that are skipped clearly without credentials, never silently reported as verified. Default live checks must be read-only and scoped to a dedicated test community.

4. Live write fixtures require explicit environment flags and an authorized disposable test account, track created fixture IDs and clean up only owned fixtures. Never perform live billing/refund/payout actions or message real users.

5. Extend CI with bounded deterministic browser/offline jobs and a separately protected/manual live job. Report exactly which runtime, browser and live checks ran.

## Acceptance and finish

- The packaged SDK passes reproducible real-browser and Node acceptance workflows.
- Live integration coverage has explicit prerequisites and truthful skipped/verified evidence.
- Tests cannot mutate customer communities or expose credentials by default.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/22.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Work directly on main. Explicitly stage only task-owned files after inspecting the diff and checking for secrets. Run the applicable checks, commit and push directly to origin/main under WORKFLOW.md, then verify the remote commit and CI evidence. Do not create task branches or pull requests, require human review/merge approval, force-push or absorb unrelated work.

Suggested commit subject, only if it matches the actual diff:

```text
✅ test(integration): verify browser and packaged SDK workflows
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, verified origin/main revision, CI state and exact remaining technical dependency or access condition. Finish this task before performing the final completion handoff below; failed pushes or mandatory checks must not be treated as completion.

When task #22 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, commits verified on origin/main and recorded results, and task #23's prerequisites pass, immediately create and open a new local circleso chat and start task #23 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/23-security-and-maintainability-review.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #23 in this chat.
