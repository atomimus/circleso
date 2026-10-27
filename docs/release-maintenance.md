# Release maintenance

Keep three immutable inputs aligned: accepted Circle specs, generated declarations and
the exact tested source revision. Installation/builds must not fetch mutable specs.
See [spec generation](spec-generation.md), [CI](ci.md) and [contributing](../CONTRIBUTING.md).

1. Deliberately compare official inputs with `npm run spec:check`. Drift fails and saves
   candidates under ignored `.cache/`; it does not accept them. Read changes against the
   official documentation and the affected operations before accepting a batch.
2. For an intended refresh, run `npm run spec:sync`, `npm run gen:types`,
   `npm run coverage:write`, then `npm run docs:write`. Inspect spec/type/request/response
   changes and migration implications. Never hand-edit generated declarations. Preserve
   missing schemas as unknown; remove an override only when upstream supplies its contract.
3. Add relevant public-boundary/type regressions and update guides, examples and CHANGELOG.
   Use `npm run validate:ci` and the separately pinned current compiler. Documentation
   discovery must include every public tracked Markdown file and TypeScript example.
4. Inspect actual tarball contents and isolated installed consumers. Public docs/support
   files must be byte-identical to accepted sources. Tests install with scripts disabled;
   production consumers must resolve actual package exports rather than source aliases.
5. Push validated explicit files to main. Verify the exact revision's required CI on every
   target before preparing a candidate. Confirm runtime/TypeScript support is still current;
   do not silently expand engines based on a newly released runtime major.

Publication is a separate, explicitly authorized operation. Candidate/stable preparation
does not authorize npm publication, tags/releases or dist-tag changes. The current
`prepublishOnly` rejects directory publication. The [publishing workflow](publishing.md)
uses the already qualified CI tarball with lifecycle scripts disabled.
Do not use `spec:sync` after validating an artifact and then publish it as the same candidate.

For an authorized publication, verify current npm trusted-publisher/provenance requirements,
identity, version/tag availability and exact built artifact before taking any irreversible
step. A prerelease uses its intended prerelease tag while latest stays unchanged. Stable
publication requires stable source/version qualification. If any result is uncertain, inspect
registry/tag/workflow state before retrying. Never overwrite a version, force-move a tag,
silently replace an artifact or automatically unpublish. Prefer a documented forward fix.

Public checks need no Circle credentials. Live integration requires a separately authorized
test community with synthetic identities and controlled cleanup. Record unavailable or
skipped external checks as unmet evidence, not passing coverage. Keep customer data,
tokens/session cookies, signed URLs and private local planning out of Git and package files.

## Dependency maintenance

Review direct/transitive dependencies and advisories before each release and regularly
during maintenance. Keep runtime dependencies small and pinned, commit the lockfile,
and use `npm ci` to reproduce it. Run `npm audit --json` for the full development tree
and `npm audit --omit=dev --json` separately; save dated evidence. An unavailable registry
or scanner error is missing evidence, not a clean audit. Neither a zero count nor an
advisory severity establishes exploitability: trace the affected version/function/input
to the actual runtime, spec tool, test server or build path. Record fixes, mitigations,
remaining exposure and the reason a release is safe or blocked.

Prefer a narrow compatible update, read official release/advisory notes, and inspect the
lock diff (including optional/native packages and install scripts). Never run a forced
audit fix as a substitute for review. The Vite 7.3.7 override retains a patched existing
major for Vitest; reassess/remove it deliberately with the next toolchain migration.
Do not expose test/dev servers to untrusted networks or run untrusted code with secrets.

Inspect each new dependency's actual license/notice and bundled code; preserve required
notices, including bundled noble hashes in LICENSE. `npm ls --all` and the lockfile cover
different things: the lock includes optional platforms absent locally. Run
`npm audit signatures` as a separate registry-signature/provenance check and report
unsupported/unverified entries accurately. Signatures/provenance identify origin/build
evidence and do not establish that code is safe.

After an update, run `npm run validate:ci`, the pinned current source compiler and browser
matrix. Offline generation must remain identical unless a deliberate spec change is
owned by the update. Inspect the actual tarball, production-only consumers, notices,
public docs and size budgets. Compare workflow/compiler measurements on equivalent
runtimes; investigate growth before raising a review budget. See the
[review and operational limits](security-review.md) and [security policy](../SECURITY.md).

## Publishing identity checks

As checked October 27, 2026, [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
requires npm ≥11.5.1 and Node ≥22.14.0. Verify the exact repository, workflow filename,
environment and allowed actions in the package's publisher configuration. New configurations
default to staged publishing; direct `npm publish` permission and dist-tag permission
are distinct settings. Do not assume an older guide's identity or permissions are current.
Use a supported hosted runner, constrain OIDC permission to the publication job, and keep
long-lived npm credentials out of the workflow. GitHub trusted publishing automatically
generates provenance; do not disable it. Verify the resulting attestation and artifact
against the tested source; [provenance](https://docs.npmjs.com/generating-provenance-statements/)
does not replace code review. The publication workflow checks the immutable tested tarball
before any authorized publication. See [publisher setup and recovery](publishing.md).
