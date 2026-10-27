# Task 19 Complete authentication and cookie integration recipes

Status: planned. This prompt has not been executed.

You are working on the circleso npm TypeScript SDK in D:/Aiville/circleso, repository https://github.com/atomimus/circleso. The goal is a trustworthy v1 release covering Admin V2, Headless Member V1 and Headless Auth. This task belongs to the v1 release track.

Implement only task 19 in this chat after direct user activation or an authorized completion handoff. Once it is fully complete, follow the final next-chat instruction below. Do not implement another task here, start missing prerequisites, spawn subagents or create automations. Read D:/Aiville/circleso/AGENTS.md and D:/Aiville/circleso/docs/v1-release/WORKFLOW.md in full, then README.md, AUDIT.md and TASKS.json in that same planning directory. Their execution rules are part of this prompt.

## Prerequisites and starting state

Required integrated tasks: 07, 08, 09, 10.

Inspect the current branch, status, staged diff and dependency PR/results before editing. Preserve existing work, especially the excluded user-owned examples/admin-get-space-member.js. If a dependency is not integrated or another task is writing this checkout, report the exact unmet condition and stop. Do not automatically perform prerequisite tasks or infer completion from a status label alone.

## Read and research

Read the relevant files/modules first:

- src/authApi/resources
- src/headlessApi/resources/cookies.ts
- src/clients/headlessAuthClient.ts
- src/clients/headlessClient.ts
- src/index.ts
- examples
- README.md

Search and read current official documentation for the exact behavior and installed dependency versions. Start with:

- https://api.circle.so/apis/headless/quick-start
- https://api.circle.so/apis/headless/auth-sdk/node.js/methods
- https://api.circle.so/apis/headless/member-api/cookies
- https://api-headless.circle.so/api/headless_auth/swagger.yaml
- https://api-headless.circle.so/api/headless_client/v1/swagger.yaml

Record relevant source links and dates in the task outcome. Never infer an undocumented endpoint, auth rule, response field or idempotency guarantee. Respect the existing module/resource style; keep HTTP behavior in core and global mutations in middleware.

## Work to complete

1. Provide complete, compiling server application-token to member-token flows for email/member ID/SSO ID, refresh and revoke. Do not falsely count the three auth-token selectors as missing API operations.

2. Make secret/token types, refresh-token lifetime/sharing, and server/browser boundaries explicit using current Circle documentation. The SDK must not persist secrets for callers.

3. Finish cookie integration through explicit credentials support and typed response metadata/raw access where necessary. Provide server Set-Cookie forwarding and supported browser examples without pretending JavaScript can override browser cookie policies.

4. Offer a safe session-redirect helper only if supported by current Circle docs; redact access-token query values from SDK logging. Avoid placing application tokens in browser examples or output.

5. Use local mocked browser/server fixtures to test the flow. Live login, logout, cookie revocation or session changes require an explicitly configured test account and must not use production users.

## Acceptance and finish

- Users have executable, end-to-end auth and cookie recipes with correct credential ownership.
- Cookies and response metadata are accessible through documented SDK APIs.
- No token persistence, cross-user session leakage or secret exposure is introduced.
- Add meaningful regression/type/contract tests for the change and run the applicable full repository checks from WORKFLOW.md. A skipped or unavailable external check is not a pass.
- Record a concise outcome in docs/v1-release/results/19.md and update only this task's record. Include dependency revisions, sources, validation evidence and remaining limitations.
- Do not publish npm, create release tags/releases, move dist-tags or trigger a publishing workflow.

## GitHub checkpoint and completion handoff

Use the accepted base and a scoped branch, normally codex/v1-task-19-auth-and-cookie-integration. Explicitly stage only task-owned files after reviewing the diff and checking for secrets. Commit, push to origin and create/update a passing reviewable PR under WORKFLOW.md. Do not auto-merge, push directly to the default branch, force-push or absorb unrelated work. Attach the PR to the task chat when supported.

Suggested commit subject, only if it matches the actual diff:

```text
✨ feat(auth): complete token and cookie integration workflows
```

If the outcome is research-only, blocked or materially different, use an accurate Gitmoji + Conventional Commits subject instead. Report the actual commit SHA, branch, PR URL, CI state and exact remaining dependency or human review step. Finish this task before performing the final completion handoff below; pending review, integration or mandatory checks must not be treated as completion.

When task #19 is fully complete under D:/Aiville/circleso/docs/v1-release/WORKFLOW.md, including required checks, pushed commits, review/integration and recorded results, and task #20's prerequisites pass, immediately create and open a new local circleso chat and start task #20 using the full saved prompt at D:/Aiville/circleso/docs/v1-release/tasks/20-usage-controls.md, the workflow and completion evidence. Use the workflow's verified project lookup and create_thread/navigate_to_codex_page procedure, record the handoff chat ID, launch it only once, and do not implement task #20 in this chat.
