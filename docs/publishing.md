# Publishing qualified artifacts

Preparation never publishes. Publication requires a separately authorized candidate or
stable run of `.github/workflows/publish.yml` on main. Ordinary pushes, tags and releases
cannot trigger it. The workflow does not create tags or GitHub releases.

## Configure the publisher

Checked October 27, 2026 against [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/):
use a supported GitHub-hosted runner, Node ≥22.14 and npm ≥11.5.1. Our publisher pins
Node 24.22.1/npm 11.19.1 on Ubuntu 24.04 and verifies both before publication.

An npm package owner must configure the existing `circleso` package on npmjs.com:

| Setting | Required value |
| --- | --- |
| Provider | GitHub Actions |
| Organization/user | `atomimus` |
| Repository | `circleso` |
| Workflow filename | `publish.yml` |
| Environment | `npm-release` |
| Allowed actions | Explicitly allow direct `npm publish` |
| Separate dist-tag management | Leave disabled; this workflow never uses `npm dist-tag` |

New publisher configurations default to staged publishing. This pipeline uses direct
publishing, so stage-only permission is insufficient. Configurations expire without a
first successful publish within two days. Recreate an expired configuration deliberately;
never substitute a local token. GitHub's environment must allow only the `main` branch,
with no reviewers, wait timer or custom approval rule. Keep it free of npm secrets.

[Provenance](https://docs.npmjs.com/generating-provenance-statements/) requires the public,
case-matching repository identity in package.json. Trusted publishing generates provenance;
the command also requests it explicitly. Only the final job has `id-token: write`.
No package manager cache or long-lived npm token is used. npm owner access and actual OIDC
acceptance must be verified during authorized publication; preparation is not proof of either.

## Prepare and identify the bytes

Deliberately reconcile live specs first, then commit the reviewed inputs and generated
declarations. Never fetch live specs during packaging or publication. From clean source:

```sh
npm ci --no-audit --no-fund
npm run validate:ci
npm run release:prepare
```

The final command refuses tracked changes, packs without lifecycle scripts and requires
the tarball digest to equal the preceding installed-consumer qualification. It writes
`.cache/release/evidence.json`: exact source SHA/tree, package version, SHA-512 integrity,
CI run/attempt, qualification details and complete package file inventory. The tarball
is beside it. Local evidence has no hosted CI identity and cannot pass the publisher.

All four Node CI jobs retain uniquely named immutable artifacts for 30 days. The publishing
workflow selects `release-SHA-ubuntu-24.04-24.x` from the supplied exact CI run. Record its
artifact ID/archive digest and the inner tarball SHA-512 separately: they hash different bytes.
Retain downloaded evidence before expiry. A changed source needs a new successful push run;
an expired artifact or conflicting rerun artifact is a failed gate, not permission to repack
and publish different bytes. Never overwrite the saved CI artifact.

## Authorized dispatch

Verify owner/publisher settings, clean main, all six exact-source CI jobs and every step,
version availability, and package evidence. Only then create the reviewed `vVERSION` tag
at that source through the authorized publication procedure. Never force-move it.

Dispatch `publish.yml` on main with these exact inputs:

| Input | Meaning |
| --- | --- |
| `version` | package.json version: `1.0.0-rc.N`, `1.0.0` or explicitly authorized `1.0.1` |
| `source_sha` | Full 40-character SHA, equal to workflow revision and current main |
| `ci_run` | Successful Offline CI **push** run for that SHA |
| `integrity` | Tarball `sha512-…` from that run's evidence |
| `dist_tag` | `next` for an RC, `latest` for stable |
| `acknowledgement` | Exact `VERSION:DIST_TAG` |

The unprivileged job verifies source/tag/CI/registry/digest, then installs those retained
bytes in strict ESM/CJS/TypeScript and real Chromium/Firefox/WebKit consumers. Its rebuild
only compares source output; it cannot replace the publication artifact. The separate
publisher installs no project dependencies and performs no build. It rechecks all gates,
then calls [npm publish](https://docs.npmjs.com/cli/v11/commands/npm-publish/) once on the
downloaded tarball with scripts disabled, an explicit registry/tag and provenance. The
directory `prepublishOnly` guard rejects accidental local directory publication instead
of regenerating hidden outputs. Publication concurrency spans the whole package.

After publication, read the exact-version metadata and dist-tag endpoints; cached full
package metadata may lag a successful publication. Verify the exact version, integrity,
provenance metadata, intended tag and preservation of every unrelated existing tag.
The publisher waits at most 180 seconds for verification, with a 10-second bound on
each pair of GETs through body parsing and a five-second polling interval. Network
errors, unreadable JSON, HTTP 404/408/429/5xx, missing provenance and a stale selected
tag can retry; Retry-After is a lower bound within the remaining total budget.
Unexpected versions/digests, changed unrelated tags and other HTTP failures stop
immediately. No retry can call npm publish, change tags or rebuild the artifact.
The GitHub environment links to the exact npm package version after verification.
Then compare source/provenance, install the registry
tarball in clean consumers, and run `npm audit signatures` there. Check the intended
[dist-tag](https://docs.npmjs.com/adding-dist-tags-to-packages/); an RC must preserve the
previous `latest`. Registry attestation metadata alone is not signature verification.

## Recovery

If a run fails or times out after submission, inspect the run, registry version/integrity,
attestation and tags before taking another action. The workflow refuses existing versions;
it never retries publication, changes tags separately, unpublishes or repairs state silently.
Post-publish metadata may need read-only rechecking after registry propagation.

A verification timeout means publication may already have succeeded. Do not rerun
the publishing job to repair its status. First independently verify registry bytes,
signatures/provenance, exact source and intended tags against retained evidence.
An authorized deployment-status correction may then append a success status with
the exact package URL and an explanation, retaining the original failed statuses
and workflow conclusion. Mark superseded deployments inactive; do not delete their
history or claim the old workflow passed. This changes GitHub metadata, not npm.

For a bad candidate, preserve evidence, fix the owning source and qualify the next unused
RC version. For a stable defect, prepare a tested forward patch. An owner may separately
authorize a narrow [deprecation](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)
such as `npm deprecate circleso@EXACT_VERSION "Upgrade to FIXED_VERSION: reason"`.
Never use a broad version range by accident. Removing a deprecation requires an equally
deliberate owner action. npm name/version pairs cannot be reused even after unpublish.
Dist-tag recovery needs its own authorization/permissions; this workflow offers no such path.

Live Circle acceptance remains separately configured; see [acceptance](acceptance.md).
Provenance identifies source/build history and does not certify runtime correctness.
