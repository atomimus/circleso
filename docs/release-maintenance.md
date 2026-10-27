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
`prepublishOnly` regenerates from committed inputs and builds; before publication, reconcile
that lifecycle with immutable artifact evidence and the approved publishing workflow.
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
