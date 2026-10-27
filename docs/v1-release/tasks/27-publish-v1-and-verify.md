# Task 27 Publish circleso 1.0.0 and verify consumer installations

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 27 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 26.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- docs/v1-release/results/26.md
- package.json
- package-lock.json
- .github/workflows
- CHANGELOG.md
- docs/v1-release/WORKFLOW.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://docs.npmjs.com/trusted-publishers/
- https://docs.npmjs.com/generating-provenance-statements/
- https://docs.npmjs.com/cli/commands/npm-publish
- https://docs.npmjs.com/adding-dist-tags-to-packages

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. This task is the stable publication task. Activation by direct user selection or the authorized completion handoff permits the reviewed v1.0.0 tag/release and npm 1.0.0 publication to latest, after every recorded gate and required review is verified. Do not request redundant approval for that already-authorized action.

2. Verify the stable preparation PR is merged, the exact release source/CI is green, checkout and version/lockfile are correct, registry version is available and trusted-publisher/environment identity matches. Stop before publishing if any material evidence differs.

3. Publish through the single reviewed workflow with provenance and correct public package metadata. Make the tag immutable; never force-move a release tag, publish a different tree under the same version, or retry an ambiguous outcome blindly.

4. Verify npm version/dist-tags, GitHub release and provenance, then install circleso@1.0.0 from the registry in clean ESM/CJS/TypeScript/browser fixtures and run acceptance workflows.

5. Record the exact release URLs, source SHA, workflow run, registry integrity and checks. If post-publication verification fails, report the concrete incident and use the documented forward-fix/deprecation process; do not unpublish/delete/retag automatically.

## Acceptance and finish

- npm latest resolves to verified circleso 1.0.0 with correct source/provenance and release notes.
- Real registry installations pass the declared consumer checks.
- Record and fully verify the v1 publication outcome before handing off to the separate task 29 Data API follow-up; do not create recurring automations.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/27.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Follow the exact publication boundary and registry verification described above; no other version, tag or package is authorized.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-27-publish-v1-and-verify. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
📚 docs(release): record the verified v1 publication
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #27 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #29's prerequisites pass, immediately create and open a new local circleso chat and start task #29 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/29-followup-data-api.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #29 in this chat.
