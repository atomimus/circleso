# Task 25 Publish and validate the v1 release candidate

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 25 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 24.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- docs/v1-release/results/24.md
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

1. This task is an external publication task. Activation by direct user selection or the authorized completion handoff permits only publishing the reviewed 1.0.0-rc.N candidate to the agreed prerelease dist-tag, normally next; it does not authorize a stable release or moving latest.

2. Before any publication, verify the prerequisite PR is merged, current branch/source SHA, clean checkout, all green checks, registry version availability, package ownership, workflow identity/environment and source-to-package evidence. Stop with a precise unmet gate if any check fails.

3. Use the verified trusted-publishing workflow and a reviewed candidate tag/source. Avoid direct local-token workarounds or multiple publish paths. For an ambiguous publish result, inspect npm and workflow state before retrying.

4. Install the actual registry candidate in clean ESM/CJS/TypeScript/browser consumers, verify metadata/provenance and execute offline acceptance flows. Reconcile the published package with the intended artifact/source.

5. Record candidate evidence, any defects and concrete rollout/soak criteria. If a defect requires code changes, return to the owning task and a new candidate version; never republish the same version or promote a failing candidate.

## Acceptance and finish

- The candidate is visible under the prerelease tag and latest remains unchanged.
- Clean registry installs and provenance/source checks pass with recorded evidence.
- Complete candidate verification and required integration before handing off to task 26; stable publication remains the separate task 27 scope.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/25.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Follow the exact publication boundary and registry verification described above; no other version, tag or package is authorized.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-25-release-candidate-publication. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
📚 docs(release): record release candidate verification
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #25 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #26's prerequisites pass, immediately create and open a new local circleso chat and start task #26 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/26-stable-release-preparation.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #26 in this chat.
