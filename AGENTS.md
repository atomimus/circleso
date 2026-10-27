# AGENTS.md — Circle.so SDK (circleso)

## Mission
Build a **type-safe**, **low-footgun** TypeScript SDK that covers **all Circle.so API surfaces** backed by the official OpenAPI specs:
- Admin API V2
- Headless Client API V1
- Headless Auth API V1

Primary goals:
- Strong typing end-to-end (request params, bodies, responses)
- Predictable error handling (actionable errors, rich context)
- Production-grade networking (timeouts, retries, rate-limit handling)
- Clean architecture and easy regeneration when specs change

## Non-goals
- UI components
- Storing secrets for users
- Automatically guessing undocumented behaviors

---

## Architecture (must stay this way)
### 1) Specs → Types
- `api/specs/*.yaml` are downloaded via `npm run spec:sync`
- `src/generated/*.d.ts` are generated via `npm run gen:types` using `openapi-typescript`
- Generated types are committed to the repo (fast installs; deterministic CI)

### 2) Typed client layer
We use `openapi-fetch` with generated `paths` types:
- `src/clients/adminClient.ts`
- `src/clients/headlessClient.ts`
- `src/clients/headlessAuthClient.ts`

### 3) Networking core
All HTTP behavior is centralized:
- `src/core/http.ts` (timeouts, retries, safe parsing)
- `src/core/errors.ts` (error classes with context)

No client should implement its own retry, parsing, or timeout logic.

### 4) Middleware
Auth + headers are middleware:
- `src/core/middleware/adminAuth.ts` sets `Authorization: Token …`
- `src/core/middleware/bearerAuth.ts` sets `Authorization: Bearer …`
- `src/core/middleware/hostHeader.ts` sets `host` header (server-side only)

If a feature needs to mutate requests/responses globally, it’s middleware.

---

## Browser vs Server policy
- Headless APIs are intended to be usable from browser environments.
- Admin API requires a `host` header and is treated as **server-side only**.
  - `communityHost` is optional; if omitted, default to `app.circle.so`.
  - Default base URL for all clients is `https://app.circle.so` unless `baseUrl` is provided.
  - In browser-like environments, creating Admin client with host header enabled must throw a config error with guidance.

Never silently “do nothing” for auth headers.

---

## Error policy (strict)
All thrown errors must be instances of:
- `CircleHttpError` (HTTP status, url, method, requestId?, parsed body)
- `CircleNetworkError` (fetch failures)
- `CircleTimeoutError`
- `CircleConfigError`

Rules:
- Never throw raw `Error` from deep internals.
- Never lose the original cause (use `cause`).
- Never throw while parsing error bodies; store best-effort parse results.

---

## Logging & secrets
- Never log tokens, refresh tokens, session cookies, or auth headers.
- If logging is supported, it must be:
  - opt-in
  - redact headers by default
  - avoid logging request/response bodies unless user explicitly enables it

---

## Auto-refresh behavior (headless)
Auto-refresh (if enabled):
- triggers once per “expired/unauthorized” event
- prevents stampedes (single flight refresh)
- retries the original request exactly once after refresh
- on refresh failure: throw a `CircleHttpError` for the refresh call (with context), and do not loop

---

## Pagination helpers
Pagination utilities live in `src/core/pagination.ts` and must:
- cap pages/items via user config
- handle empty pages
- expose `AsyncIterable` interfaces where possible

---

## Code style
- Prefer small, testable modules
- No duplicated constants for header names; keep them in one place
- Prefer explicit types at boundaries (public APIs)
- Internal helpers can infer types, but must remain readable
- Keep exports stable; breaking changes require a major bump

## Git workflow
- Work directly on `main` and push validated commits to `origin/main`.
- Do not create task branches or pull requests, or wait for human review or merge approval.
- Preserve unrelated work, stage explicit task-owned files, and run the applicable checks before pushing.
- Keep all `v1-release/` folders local-only. Never force-add or commit their contents.
- Verify completed task commits are on `origin/main` before the authorized next-task handoff.

---

## Testing strategy
- Use `vitest`
- Mock fetch at the boundary (the “smart fetch” layer)
- Tests must cover:
  - retries (including Retry-After)
  - timeout behavior
  - safe parsing and 204 handling
  - middleware header injection
  - headless auto-refresh single-flight logic

---

## Release checklist
Before publishing:
1. `npm run spec:sync && npm run gen:types` (ensure no accidental spec drift)
2. `npm run typecheck`
3. `npm test`
4. `npm run build`
5. Verify README examples compile
6. Update CHANGELOG
7. Tag release and publish
