# Task 14 Add Admin workflow and directory filter resources

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 14 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 05, 08.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/adminApi/index.ts
- src/adminApi/resources/communitySegments.ts
- src/adminApi/resources/profileFields.ts
- src/generated/admin-v2.d.ts
- api/specs/admin-v2.yaml

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api.circle.so/apis/headless/member-api/community-member-search

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Implement the five workflow operations (list/get/activate/deactivate/duplicate) and six directory-filter operations (configuration plus control list/create/get/update/delete), following the current official spec.

2. Use generated discriminated filter types where available and preserve meaningful unknown/open objects from upstream. Do not invent filter operators, eligibility behavior or trigger APIs.

3. Keep a distinction between configuring a filter control and searching members with a filter. Add concise examples of each and document documented replacement/visibility behavior.

4. Test representative polymorphic payloads, query/path serialization, no-content responses and permission failures at the shared fetch boundary. Workflow changes must be mocked.

5. Update the API inventory and add only these two resource families.

## Acceptance and finish

- All 11 operations have typed facade coverage and working compile-time examples.
- Filter variants preserve documented discriminators and required fields.
- No live automation is activated, deactivated or duplicated by tests.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/14.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-14-admin-workflows-and-filters. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(admin): add workflow and filter resources
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #14 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #15's prerequisites pass, immediately create and open a new local circleso chat and start task #15 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/15-remaining-admin-resources.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #15 in this chat.
