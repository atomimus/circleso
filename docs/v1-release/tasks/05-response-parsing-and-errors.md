# Task 05 Unify response parsing and SDK error guarantees

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 05 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/core/http.ts
- src/core/client.ts
- src/core/errors.ts
- src/adminApi/request.ts
- src/headlessApi/request.ts
- src/authApi/request.ts
- src/clients/shared.ts
- src/clients/headlessClient.ts

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://fetch.spec.whatwg.org/
- https://openapi-ts.dev/openapi-fetch/
- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://api-headless.circle.so/api/headless_auth/swagger.yaml

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Reproduce empty-body HTTP 400 returning undefined, lost plain-text/malformed-JSON error bodies, malformed successful JSON throwing SyntaxError, and iterator errors throwing plain objects.

2. Centralize parsing/error normalization in the networking core and remove divergent parsing paths in the generic client, resource requesters and iterator adapters. Preserve the documented openapi-fetch raw {data,error,response} contract while making every thrown exception use an allowed SDK class.

3. Determine HTTP failure from response status rather than truthiness of an error payload. Handle 204/205, empty success bodies, JSON/+json/text content, malformed JSON, false/null/string bodies, consumed streams and body-read failures predictably.

4. Carry method, resolved URL, status, request ID/correlation ID, best-effort body and cause. Define malformed-success-body behavior within the existing four error classes; do not invent an undocumented fifth class or expose secrets through automatic logs.

5. Add focused cross-surface and iterator contract tests. Keep generated files generated and public exports compatible with the documented v1 migration.

## Acceptance and finish

- Every reproduced failure yields the documented SDK behavior with useful context.
- Parsing failure never replaces an HTTP error with a raw exception or hides a non-2xx response.
- Public raw-client result behavior and resource-client throwing behavior are both tested and documented.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/05.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-05-response-parsing-and-errors. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(errors): preserve response failures and original causes
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #05 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #06's prerequisites pass, immediately create and open a new local circleso chat and start task #06 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/06-retries-and-rate-limits.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #06 in this chat.
