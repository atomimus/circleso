# Data API contract and access

circleso does not currently export a Data API client. Data API implementation is
blocked on confirmed account entitlement and an explicitly authorized test community
with a Data API credential. Public documentation access does not establish API access.
No live event data has been requested or qualified.

## Official sources

Checked October 27, 2026:

| Source | Evidence |
| --- | --- |
| [Data API overview](https://api.circle.so/apis/data-api) | Analytics add-on; contact Circle sales for access |
| [Developer overview](https://api.circle.so/get-started/overview.md) | Describes add-on availability; confirm eligibility for the account with Circle |
| [Interactive reference](https://app.circle.so/data_api/docs) | Loads the official OpenAPI document below |
| [OpenAPI contract](https://app.circle.so/data_api/docs/openapi.yaml) | OpenAPI 3.0.0, title Data API, version V1; three GET operations and 56 component schemas |
| [Circle's Airbyte connector](https://app.circle.so/data_api/docs/airbyte_connector.yaml) | Bearer authentication, event extraction, continuation links and incremental timestamps |

The downloaded OpenAPI document was 90,336 bytes, SHA-256
`3e0bbedde4238d5ebb702689d52003408ee84d6e026386c180e3bc4135015408`.
All 135 references resolve within that document. The installed
`openapi-typescript@7.10.1` generated declarations from the cached contract offline;
this checks generation feasibility, not server behavior or SDK support.

## Documented behavior

The contract names `https://app.circle.so` as its server and HTTP Bearer authentication
for every operation. It does not document how to obtain a Data API token or establish
that an Admin or Headless token is interchangeable.

| GET path | Documented purpose |
| --- | --- |
| `/data_api/v1/community_events` | Community events, with an optional event-name filter |
| `/data_api/v1/analytics_tracker_events` | PageView, PageExit and PostView analytics events |
| `/data_api/v1/member_visit_events` | Deprecated historical visits; stopped receiving new events in October 2025 |

The specification documents the following behavior:

- Responses use JSON `events` and `pagination`. Follow `next_page_uri`; its absence
  ends pagination. URI properties are also nullable in the schema. Page size defaults
  to, and is capped at, 2,000 according to the contract's prose.
- Query parameters include `page`, `per_page`, `sort`, `base_timestamp`, `from_date`,
  `to_date` and `created_at_gt`. `base_timestamp` bounds events for consistent
  pagination. The default initial fetch returns the latest events first.
- Incremental reads use `created_at_gt` with the previous maximum `created_at` or
  initial sync start time. Backfilled events can have older `triggered_at` values;
  the docs direct consumers to use `created_at` for incremental reads.
- The stated limit is 600 requests per minute, with HTTP 429 on excess. Its scope,
  response headers and error-body format are unspecified. Admin API quotas must not
  be substituted for Data API limits.
- Only paginated `application/json` successes are specified. No export-job, CSV,
  file-download, NDJSON or persistent streaming operation is defined. An event
  stream description does not establish a wire streaming protocol.

The schema leaves response properties optional and does not define error bodies.
It does not establish exactly-once delivery, timestamp tie handling, retention,
continuation-link lifetime or a complete deletion/backfill recovery policy.
Warehouse checkpoints, deduplication, credential storage and ETL orchestration remain
application responsibilities.

## Access questions before implementation

1. Is the Data API add-on enabled for the intended community, and what plan or
   commercial entitlement applies to that account?
2. How is a Data API Bearer token issued, scoped, rotated and revoked? Which
   community and operations does it authorize, and are any routing headers required?
3. Can an explicitly authorized test community provide synthetic events for bounded,
   read-only qualification, with the credential configured securely outside chat?
4. What is the quota scope, and what headers and error schemas apply to throttling
   and entitlement failures?
5. What guarantees apply to continuation URLs, timestamp ties, late/backfilled
   events, retention and deletion? Are additional export contracts available?

Until entitlement and authorized test access are confirmed, supported clients remain those in
the [API reference](api-reference.md). Synthetic contract checks cannot qualify
account access or production extraction.
