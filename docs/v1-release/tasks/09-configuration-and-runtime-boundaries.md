# Task 09 Finish configuration validation and server browser boundaries

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 09 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 04, 05, 08.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/index.ts
- src/clients/adminClient.ts
- src/clients/headlessClient.ts
- src/clients/headlessAuthClient.ts
- src/core/constants.ts
- src/core/middleware/adminAuth.ts
- src/core/middleware/bearerAuth.ts
- src/core/middleware/hostHeader.ts
- README.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api-headless.circle.so/api/admin/v2/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml
- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://api.circle.so/apis/admin-api/quick-start
- https://api.circle.so/apis/headless/quick-start
- https://fetch.spec.whatwg.org/

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Implement the agreed default URL policy: all clients default to https://app.circle.so unless baseUrl is supplied; communityHost defaults to app.circle.so and must not silently rewrite the network destination.

2. Validate URLs, host values, blank tokens, token hooks and incompatible options early using CircleConfigError with causes where relevant. Keep auth/header mutation in middleware.

3. Make Admin creation reject browser-like runtimes, including relevant worker contexts, with actionable guidance; preserve browser-usable Member clients and avoid unconditional Node imports in their bundles.

4. Clearly separate server-only Headless Auth application-token usage from member access/refresh tokens. Resolve the Admin quick-start Bearer versus spec Token discrepancy through official evidence and the explicit AGENTS.md policy; do not guess or silently switch authentication schemes.

5. Test defaults, custom communityHost/baseUrl independently, custom fetchers, browser/worker detection and token-provider failures. Document the unified client's requirements and standalone factory choices.

## Acceptance and finish

- Configuration behavior matches the public documentation and repository policy.
- Admin host injection is rejected where forbidden, while Member clients bundle and operate in supported browsers.
- Authentication schemes and server-only secret boundaries are documented with sources and tested.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/09.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-09-configuration-and-runtime-boundaries. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
🐛 fix(config): validate hosts tokens and runtime boundaries
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #09 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #10's prerequisites pass, immediately create and open a new local circleso chat and start task #10 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/10-logging-and-secret-redaction.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #10 in this chat.
