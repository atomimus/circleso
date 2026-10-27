# Security policy

Report suspected SDK vulnerabilities through
[GitHub private vulnerability reporting](https://github.com/atomimus/circleso/security/advisories/new).
The setting was enabled and verified on October 27, 2026. Sign in to GitHub, choose
**Report a vulnerability**, and include affected SDK/runtime versions, the method,
a synthetic reproduction, prerequisites and impact. Omit tokens, cookies, signed URLs,
customer data and unsanitized errors/causes. If the form is unavailable, keep sensitive
details private; a public [issue](https://github.com/atomimus/circleso/issues) may request
restoration of reporting without disclosing the vulnerability. No response-time SLA is promised.

## Supported versions

The registry release is 0.3.0; v1 on main is unreleased. Reports about either are welcome.
Historical versions have no backport guarantee: remediation may require upgrading.
After v1 publication, the latest maintained 1.x release is the security-fix target.
See [support](SUPPORT.md) and [migration](docs/migration-v1.md).

## Security boundaries

- Keep Admin/application/refresh tokens on servers. Browser/worker Member clients use
  member tokens. Runtime checks cannot protect a secret already embedded in a bundle.
- Destinations, Host, hooks, raw overrides, middleware and fetchers are trusted application
  configuration. `communityHost` is separate from network `baseUrl`. Use HTTPS for remote
  credentials; HTTP is accepted for controlled local/proxy use. The SDK is not an SSRF
  filter or a tenant authorization layer.
- Ordinary API calls retain native Fetch redirects, which can forward request bodies.
  Constrain destinations/reject redirects at your proxy or fetcher when needed; see
  the [review and deployment recipe](docs/security-review.md). Storage PUTs are isolated
  HTTPS requests with credentials omitted, redirects refused and supported headers only.
- Logging is opt-in and redacted. Raw errors/causes/bodies/URLs, session URLs and signed
  identifiers remain sensitive; never send them wholesale to telemetry.
- Rich text is data, not sanitized HTML. Types do not validate remote data. Applications
  own safe rendering, identity checks, cookie forwarding/CSRF and cache isolation.

Leaks to unintended destinations, cross-client state exposure, bypasses of implemented
controls and exploitable dependency paths are in scope. Circle service authorization,
malicious application fetchers and unsafe application rendering have their own owners;
describe any SDK contribution precisely. Test only synthetic fixtures or an authorized
dedicated community.

Maintainers should reproduce safely, assess impact/reachability and affected versions,
coordinate a fix and regression evidence privately, then publish a corrected version
and advisory when appropriate. Rotate exposed credentials with their issuer. Avoid
public exploit disclosure before coordinated remediation. See
[release maintenance](docs/release-maintenance.md).
