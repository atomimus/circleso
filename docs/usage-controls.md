# Optional usage controls

All load controls and caching are disabled unless explicitly configured. `usage` is a
client-level option on `createAdmin`, `createHeadless`, `createAuth`, their raw factories,
`createSmartFetch` and `CircleSo`. It creates private state for each constructed client;
reusing the same configuration object does not share queues, results or circuit state.
`CircleSo` gives each of its three surfaces a separate controller. Existing timeout,
retry, parsing, auth, cookie and error behavior stays unchanged when `usage` is omitted.

```ts
import { createHeadless, type UsageControlsConfig } from "circleso/headless";

const usage: UsageControlsConfig = {
  maxConcurrent: 4,
  maxQueueSize: 50,
  maxQueueWaitMs: 5_000,
  rate: { maxRequests: 20, intervalMs: 10_000 },
  circuitBreaker: { failureThreshold: 5, cooldownMs: 30_000 },
};
const member = createHeadless({
  accessToken: "synthetic-member-token", // obtain from your application's verified session
  timeoutMs: 10_000,
  usage,
});
void member;
```

These numbers are application policy examples. Circle's documented rate limit is IP-wide
and mutable; other clients, processes, communities and applications can use the same IP.
An in-memory client cannot enforce your monthly plan allowance or guarantee that Circle
will accept the next request. Use an application-owned gateway/distributed admission
service for shared quotas. A supplied `fetcher` runs inside SDK admission and existing
HTTP lifetimes; it can enforce additional policy but must honor the request signal.
It must return full Fetch responses and must never cache Auth/cookie calls implicitly.
There is no shared scheduler, distributed quota, persistent circuit or global cache.

## Admission and retry budgets

When `usage` is present, omitted fields default to four active attempts, 100 queued
attempts and a 30-second queue deadline. Rate limiting and the circuit remain disabled
until their respective objects are supplied. Limits are validated and copied at client
creation; mutating the original configuration later has no effect.

| Setting | Accepted values |
| --- | --- |
| `maxConcurrent` | Integer 1 through 10,000 |
| `maxQueueSize` | Integer 0 through 10,000; zero rejects waits |
| `maxQueueWaitMs` | Integer 1 through 2,147,483,647; cannot be disabled |
| `rate.maxRequests` | Integer 1 through 10,000 |
| `rate.intervalMs` | Integer 1 through 2,147,483,647 |
| `circuitBreaker.failureThreshold` | Integer 1 through 10,000 |
| `circuitBreaker.cooldownMs` | Integer 1 through 2,147,483,647 |
| `circuitBreaker.failureStatuses` | Up to 200 integer HTTP statuses, each 400 through 599 |

Admission is FIFO. Each admitted attempt reserves one start in a rolling `intervalMs`
window, including attempts that fail during body preparation. Reservations are never
refunded. This is a conservative local start budget, without a promise about how Circle
counts billable requests. Storage is bounded by the queue/start limits. A backward wall
clock jump delays admission conservatively; runtime suspension and event-loop delays
can lengthen waits. Rate and queue timers exist only while there are waiters.

Concurrency covers body preparation, transport and response-body ownership until EOF,
cancellation or deadline. Consume or cancel streaming responses and unused clones.
Caller cancellation and `timeoutMs` include queue time; the queue's independent residence
deadline also applies when `timeoutMs` is zero/omitted. A cooperative transport stops its
I/O on abort. The SDK releases logical capacity when it stops waiting; it cannot bound
physical I/O in an uncooperative custom fetcher or dispose resources retained by callers.

Every ordinary retry, refresh PATCH and original-request replay must acquire admission.
Retry waits retain no concurrency slot. Existing backoff and `Retry-After` still apply;
admission may delay a retry further and never shortens the server's wait. Queue residence
and per-attempt deadlines reset for each attempt. There is no total logical-call deadline:
pass a caller-owned `AbortSignal` across retries/waits for that budget. Shared refresh keeps
its existing independent deadline and cancellation semantics. The original 401 releases its
slot before refresh, avoiding a one-slot deadlock. Refresh is still single-flight and never
retried; the original request is replayed at most once, with no retry after that replay.

Overflow and open/half-open rejection throw `CircleNetworkError` with a frozen,
credential-free `cause.code` of `CIRCLE_QUEUE_FULL` or `CIRCLE_CIRCUIT_OPEN`.
These local failures do not start HTTP or automatically retry. Queue expiry throws
`CircleTimeoutError` with its queue `timeoutMs` and a `TimeoutError` cause. Caller aborts
preserve their original cause. Invalid configuration throws `CircleConfigError`.
If a server failure opens the circuit before an eligible retry, that retry is rejected
locally; its circuit rejection becomes the final error. Original errors/raw responses
and their context can still contain sensitive data and must not be logged wholesale.

## Circuit behavior

The optional circuit counts consecutive completed header outcomes in completion order.
It defaults to counting HTTP 429/500–599 and fetch rejections. Other HTTP statuses reset
the count, including 401/403. Caller cancellation, SDK timeouts, preparation errors and
body/parse errors do not count. No token contents or server error messages are inspected.
For deliberate fail-fast treatment of specific 4xx errors, provide `failureStatuses`;
that list replaces the default. Including 401 can prevent refresh admission and including
429 can end ordinary retries. Choose a threshold appropriate for your recovery policy.

At the threshold the circuit opens, rejects all queued work, and rejects new work without
timers until the cooldown elapses. Already active attempts continue. After cooldown only
one admitted probe runs; competing calls fail immediately. Rate/concurrency limits still
apply to that probe. Healthy probe headers close the circuit; a failed probe reopens it.
A canceled/preparation-failed probe also reopens conservatively. Late outcomes from an
older circuit generation cannot close or extend the newer circuit. Health is based on
headers/transport, so healthy headers followed by a broken body do not reopen it.

The controller records only counters, timestamps and statuses. It accepts no metric labels,
cache keys or credential callbacks, and emits no new logging. Existing opt-in redacted
logger hooks can count logical calls; they do not count individual retry/refresh attempts.
Use application metrics with fixed labels, without tokens, member IDs, URLs or query values.

## Explicit server read-cache recipe

The SDK provides no automatic response cache. The complete, compiled and regression-tested
[session space cache example](https://github.com/atomimus/circleso/blob/main/examples/usage-controls.ts) is application code you may copy.
It requires Node server Fetch that exposes all Set-Cookie headers; it must not be used
with browser-filtered responses, a custom transport that hides cookies, or a shared CDN.
Browsers filter Set-Cookie even when the network response contains it, so an absent visible
header cannot prove that a browser response is safe to retain.

Create one cache closure **and** one Member client for a single verified principal,
community, API surface and authorization/permission generation. Keep its lifetime within
the authenticated application session. Its private key is only the numeric space ID;
method/route, community and principal are fixed by the closure. Never key by raw tokens,
Authorization, cookies, email addresses or complete URLs. A token hash is still a sensitive
identifier and is unnecessary here. Do not expose or serialize this map into logs/metrics.
Retire the closure/client on logout, member/community changes, credential rotation or
permission changes. Token hooks must invalidate/retire it when authorization changes;
do not wrap a client whose principal can silently change without this integration.

The recipe exposes only `get(id, signal)`, `invalidate()`, `change(write)` and `retire()`.
It never shares pending requests. Its single allowlisted GET uses `credentials: "omit"`
and transport `cache: "no-store"`, with no caller-controlled headers/query/locale variants.
It retains only unfiltered HTTP 200 JSON data with explicit positive server max-age, no no-store or
no-cache directive, no Vary and no Set-Cookie. It subtracts a valid Age and caps its own
retention at five seconds, 32 entries and 64 KiB encoded data per entry. It copies values
on retention/hits so caller mutations do not poison other reads. This is a small application
cache with a chosen staleness tolerance, not a general HTTP cache or validator/ETag engine.
Missing freshness headers mean a normal uncached read. It makes no claim that Circle's
space endpoint currently supplies cacheable headers; the synthetic tests supply them.

Wrap every relevant write in `change(() => member.spaces.join(id))` or the corresponding
mutation. It clears before and after, including uncertain failures; reads during a write
bypass retention. In-flight reads cannot refill after invalidation. `invalidate()` handles
external changes; `retire()` permanently rejects future and finishing in-flight reads.
Any failed read clears the cache; caller cancellation also applies on hits. All other
mutations, Auth methods, refresh and cookies remain outside caching. Do not add them to
an allowlist, and never store or share raw responses, Set-Cookie or error objects.

For other resources, define an equally narrow allowlist and complete scope/variant key.
Permission changes performed elsewhere remain invisible until explicit invalidation or
expiry. If even brief stale access is unacceptable, leave caching disabled. Invalidate
affected lists/details after writes and account for failed writes that may have reached
the server. There is no SDK transaction, snapshot, deduplication or idempotency guarantee.

Sources checked October 27, 2026:
[Circle usage and limits](https://api.circle.so/apis/admin-api/usage-and-limits),
[usage optimization](https://api.circle.so/apis/admin-api/usage-and-limits/optimizing-usage),
[best practices](https://api.circle.so/apis/admin-api/usage-and-limits/best-practices),
[official Member specification](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml),
[Fetch standard](https://fetch.spec.whatwg.org/) and its
[official source](https://raw.githubusercontent.com/whatwg/fetch/main/fetch.bs), and
[openapi-fetch request options](https://openapi-ts.dev/openapi-fetch/api).
