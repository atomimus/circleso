# Task 18 Add documented rich text types and builders

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 18 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 02, 08.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/generated/admin-v2.d.ts
- src/generated/headless-client-v1.d.ts
- src/adminApi/resources/posts.ts
- src/adminApi/resources/messages.ts
- src/headlessApi/resources/comments.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/get-started/concepts/rich-text-body
- https://api.circle.so/get-started/concepts/tiptap-editor
- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Model the documented rich-text structures and provide small composable builders for paragraphs, text, links, mentions, line breaks and signed attachments. Add other block variants only when their contract is verifiable.

2. Keep the builders assignable to the generated request bodies. Identify documentation/spec disagreements explicitly; use a narrow reviewed compatibility layer when justified rather than editing generated declarations.

3. Validate required attributes and useful low-footgun constraints without introducing a UI/editor, fetching mention identities automatically or promising HTML sanitization the SDK does not perform.

4. Preserve forward-compatible escape hatches as explicitly typed/documented values; avoid any-based builders that pretend to validate arbitrary trees.

5. Compile realistic post/comment/message examples and test representative nested structures, malformed input and attachment identifiers.

## Acceptance and finish

- Documented common rich-text content can be created without handwritten nested JSON.
- Builders work with real public method types and reject meaningful invalid inputs.
- The package includes no UI framework and makes precise validation claims.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/18.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-18-rich-text-builders. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(content): add typed rich text builders
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #18 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #19's prerequisites pass, immediately create and open a new local circleso chat and start task #19 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/19-auth-and-cookie-integration.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #19 in this chat.
