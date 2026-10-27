# Continuous validation

The [offline workflow](../.github/workflows/ci.yml) validates direct pushes to `main`, pull requests
targeting `main` and manual dispatches. Every job installs the exact `package-lock.json` dependency
tree with `npm ci --no-audit --no-fund` and runs the same checks. No Circle credentials are needed.
The install downloads public npm packages; "offline" means the checks use committed specs and
synthetic fixtures rather than Circle services. There are no publish/tag steps or publishing tokens.

## Runtime policy

| Runner | Node selector | Purpose |
| --- | --- | --- |
| Ubuntu 24.04 | `22.x` | Maintained minimum major |
| Ubuntu 24.04 | `24.x` | Recommended major |
| Windows 2025 | `24.x` | Representative Windows validation |
| macOS 15 | `24.x` | Representative macOS validation |

`check-latest: true` selects the latest available patch of each declared major. Jobs log exact
Node/npm versions; npm is the version bundled with the selected Node distribution. The lockfile
remains authoritative on both npm 10 and 11. Inspect the exact commit's GitHub Actions logs for
actual executed versions/results rather than treating this table as proof of execution.

As checked October 27, 2026, Node 22/24 are LTS and Node 26 is Current, with LTS scheduled for
October 28. Node 26 remains unqualified; reassess before release. Node 18/20 are excluded from
the v1 target. The current 0.3.0 package engine/build target and development Node types remain
baseline metadata until task 11 reconciles them. This workflow does not certify all v1 behavior.

## Local equivalent

Use a maintained patch of Node 22 or 24 (Node 24 recommended), with its bundled npm:

```sh
npm ci --no-audit --no-fund
npm run validate:ci
git diff --exit-code
```

`validate:ci` stops on the first failure and executes these commands in order:

```sh
npm run lint
npm run typecheck
npm test
npm run gen:check
npm run coverage:check
npm run build
npm run pack:check
```

`lint` passes Git-tracked working-tree files to the installed Biome CLI without a shell. New files
must be explicitly staged before linting; deleted tracked files are skipped. It preserves Biome's
generated/dependency exclusions while covering all tracked SDK code and supported config formats.
Untracked private files are never lint inputs. `.gitattributes` keeps text LF on every platform,
including checkouts with `core.autocrlf=true`. `format` still targets the working directory; use
explicit task-owned paths when formatting in a shared dirty checkout.

`gen:check` and `coverage:check` fail on drift without repairing outputs. `pack:check` is
`npm pack --dry-run --json --ignore-scripts`; the build must already have passed. It inspects the
package list without running publication/lifecycle hooks. It is not a clean-tarball consumer test.
The final Git diff check detects accidental tracked rewrites, including dependency/lockfile drift.

## Trust and live services

Both workflows grant only `contents: read`, pin reviewed official actions to full commit SHAs,
disable persisted checkout credentials and automatic package caching, cancel superseded runs, and
limit job durations. Public validation uses `pull_request`, never privileged `pull_request_target`
or `workflow_run`. No protected environment or repository secret is referenced.

Reviewed pins on October 27, 2026:

- [checkout v7.0.1](https://github.com/actions/checkout/tree/3d3c42e5aac5ba805825da76410c181273ba90b1)
  (`3d3c42e5aac5ba805825da76410c181273ba90b1`)
- [setup-node v7.1.0](https://github.com/actions/setup-node/tree/949feb2413d6458794dcd2491c4babbbce0c15c1)
  (`949feb2413d6458794dcd2491c4babbbce0c15c1`)

The [live-spec workflow](../.github/workflows/live-spec.yml) runs only on an explicit manual
dispatch selecting `main`. It invokes `npm run spec:check`, comparing the three public Circle
specs without accepting changes. It needs no community credentials and does not run on pushes or
pull requests. Drift is a failure, not a passing skip; reproduce locally for the saved candidate
files/patches described in [spec generation](spec-generation.md).

No integration workflow exists yet: task 22 owns live tests against a separately authorized test
community. Keep those jobs separate from public checks, without forwarding credentials to untrusted
code. Do not add placeholder skipped tests as evidence.

## Extending the gates

Tasks 11/21 add permanent strict type consumers and compiled documentation/examples; tasks 11/22
add clean tarball consumers, browser bundles and actual browser qualification. Task 23 adds the
dependency/security gates. Extend `validate:ci` for checks that can run publicly without secrets,
and add dedicated workflows for authorized live integrations. Task 24 separately prepares the
publication path; none is enabled here.

Primary sources checked October 27, 2026: [Node releases](https://nodejs.org/en/about/previous-releases),
[release schedule](https://github.com/nodejs/Release/blob/main/schedule.json),
[Vitest 4 guide](https://v4.vitest.dev/guide/),
[GitHub Node CI](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs),
[secure workflows](https://docs.github.com/en/actions/reference/security/secure-use),
[npm ci](https://docs.npmjs.com/cli/v11/commands/npm-ci/) and
[npm pack](https://docs.npmjs.com/cli/v11/commands/npm-pack/).
