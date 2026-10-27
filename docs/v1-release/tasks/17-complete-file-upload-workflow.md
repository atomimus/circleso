# Task 17 Add the complete direct upload workflow

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 17 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04, 05, 06, 08, 09, 10.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/adminApi/resources/directUploads.ts
- src/headlessApi/resources/directUploads.ts
- src/core/http.ts
- src/generated/admin-v2.d.ts
- src/generated/headless-client-v1.d.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/get-started/concepts/file-uploads
- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://fetch.spec.whatwg.org/
- https://streams.spec.whatwg.org/

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Implement a documented helper around metadata/checksum preparation, Circle direct-upload registration, the signed storage PUT and a typed result containing the signed attachment identifiers. Preserve existing directUploads.create.

2. Choose maintained, documented checksum tooling with known-vector tests and a minimal browser-compatible dependency surface. Do not hand-roll cryptographic algorithms or assume browser Web Crypto supports MD5.

3. Support the agreed Node/browser input types with bounded memory behavior, explicit limits and cancellation. Define behavior for streaming inputs and caller-supplied checksums without claiming unsupported streaming guarantees.

4. Treat the signed storage URL as a separate request destination: forward only documented upload headers, never Circle tokens/cookies. Keep networking/errors in shared core facilities and avoid logging signed credentials or file bodies.

5. Test successful registration/upload, headers, known checksums, storage failure, cancellation, large-input limits and no credential leakage. Use mocked Circle and storage endpoints.

## Acceptance and finish

- A caller can upload a supported file end-to-end and receive the signed identifier for later API calls.
- The helper behaves consistently in supported Node and browser consumers.
- Storage requests cannot inherit Circle authentication accidentally.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/17.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-17-complete-file-upload-workflow. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(uploads): support complete direct upload workflows
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #17 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #18's prerequisites pass, immediately create and open a new local circleso chat and start task #18 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/18-rich-text-builders.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #18 in this chat.
