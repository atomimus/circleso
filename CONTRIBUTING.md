# Contributing to circleso

Read [AGENTS.md](AGENTS.md) for the architecture and
[the v1 contract](docs/v1-release/CONTRACT.md) for compatibility requirements. The numbered release
work follows [WORKFLOW.md](docs/v1-release/WORKFLOW.md); selecting a task activates only that task.
Use one implementation task per checkout. Preserve unrelated work and stage explicit paths.

## Development

Use a maintained Node LTS, preferably Node 24, and install the exact lockfile dependencies with
`npm ci`. The current repository's engine and build target still reflect 0.3.0. Tasks 03 and 11
will qualify and apply the v1 matrix before publication. Dependencies are pinned; upgrades need
their own evidence and review.

```sh
npm run lint
npm run typecheck
npm test
npm run gen:check
npm run coverage:check
npm run build
npm pack --dry-run --json --ignore-scripts
```

`gen:types` is offline and must reproduce the committed declarations from `api/specs/*.yaml`.
Review any generated diff. Use `npm run spec:check` for a deliberate, read-only live comparison
with inspectable candidate files/patches. Run `npm run spec:sync` only when deliberately refreshing
upstream inputs, then regenerate, run `npm run coverage:write`, and inspect all diffs. Never edit
generated types by hand. See [the tooling guide](docs/spec-generation.md) and
[the generated inventory](docs/api-coverage.md).
The release checklist in AGENTS.md also requires a deliberate spec refresh before publication;
tasks 24–27 must reconcile it with building from immutable, reviewed release inputs.

The lint command checks the repository. In a shared dirty checkout, pass only tracked and
task-owned files to the installed Biome CLI so unrelated private files are neither read nor
printed. Do not hide SDK source from CI. Do not run the user-owned
`examples/admin-get-space-member.js` or include it in a commit without explicit authorization.

## Changes and validation

Keep public entry points, existing resource names and flat options stable. Keep networking and
error handling in `src/core`, and global header/request/response changes in middleware. New API
behavior needs an official operation/schema reference. Record upstream limitations instead of
inventing schema fields or authentication behavior.

For behavior changes, reproduce the case through a public client with a mocked fetch boundary,
then add a regression or type contract test in Vitest. Cover failure paths, bounded retries,
timeouts, cancellation and refresh concurrency where affected. Documentation-only changes need
link/example checks, not artificial unit tests. Run the applicable gates above and record actual
exit codes; a skipped check is not a pass. Packaging changes also need clean tarball consumers.

Use synthetic data. Keep Circle application/Admin tokens on the server. Never commit or print
credentials, auth headers, cookies, private member data or signed upload URLs. Logging is opt-in
and redacts secrets by default. A live test requires a separately authorized test community.

## Commits and release

Work directly on `main`. Inspect the diff, check only task-owned files for secrets, stage explicit
paths, run the applicable checks, and make one cohesive commit using:

```text
<gitmoji> <type>(<scope>): <imperative summary>
```

Push validated commits directly to `origin/main`. Separate branches, pull requests and human
review/merge approval are not part of this workflow. Keep CI results and limitations visible;
do not force-push. Breaking public runtime or TypeScript changes require a major release
and migration notes. The current refresh belongs in v1, not an unannounced 0.3.x update.

## Task outcomes

For task NN, write `docs/v1-release/results/NN.md`. Include the activation date, initial revision,
integrated dependency revisions, official source links and dates, reviewed changes, exact
validation evidence, known failures and owning task IDs, and remaining technical/access gates.
Supply the final commit SHA, `origin/main` integration evidence and check state in the chat;
a commit cannot contain its own final SHA. Update only the selected record in `TASKS.json`.

`integrated` requires verifying that `origin/main` includes the validated task commit. Do not
launch a successor while a mandatory check or push is pending. Follow the saved handoff procedure
once all technical gates pass and record the returned chat ID once. Publication is restricted
to tasks 25 and 27; ordinary task commits
must not publish npm packages, create release tags or move dist-tags.
