import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repository = "atomimus/circleso";
const registryUrl = "https://registry.npmjs.org/";
const directory = ".cache/release";
export const requiredJobs = [
  "Node 22.x / ubuntu-24.04",
  "Node 24.x / ubuntu-24.04",
  "Node 24.x / windows-2025",
  "Node 24.x / macos-15",
  "Browsers / Node 22.x / ubuntu-24.04",
  "Browsers / Node 24.x / ubuntu-24.04",
];
export type ReleaseInput = {
  version: string;
  sha: string;
  run: string;
  integrity: string;
  distTag: "next" | "latest";
};
export type Registry = {
  versions: Record<string, { dist: { integrity: string; attestations?: unknown } }>;
  "dist-tags": Record<string, string>;
  time?: Record<string, string>;
};
export type Evidence = {
  schema: 1;
  repository: string;
  source: string;
  tree: string;
  version: string;
  filename: string;
  integrity: string;
  ciRun: string | null;
  ciAttempt: string | null;
  qualification: { version: string; integrity: string };
  files: { path: string; size: number; mode: number }[];
};
type Job = { name: string; conclusion: string; steps: { conclusion: string }[] };
type Run = {
  id: number;
  run_attempt: number;
  head_sha: string;
  head_branch: string;
  event: string;
  path: string;
  status: string;
  conclusion: string;
  repository: { full_name: string };
};

export function releaseInput(env: NodeJS.ProcessEnv, version: string): ReleaseInput {
  assert.equal(env.GITHUB_EVENT_NAME, "workflow_dispatch", "Manual dispatch required");
  assert.equal(env.GITHUB_REPOSITORY, repository, "Wrong repository");
  assert.equal(env.GITHUB_REF, "refs/heads/main", "Dispatch on main required");
  assert.equal(env.RUNNER_ENVIRONMENT, "github-hosted", "GitHub-hosted runner required");
  assert.match(
    version,
    /^1\.0\.(?:0(?:-rc\.[1-9]\d*)?|1)$/,
    "Only 1.0.0 stable/numbered RC or authorized 1.0.1 allowed",
  );
  assert.equal(env.RELEASE_VERSION, version, "Version does not match package");
  const sha = env.RELEASE_SOURCE ?? "";
  assert.match(sha, /^[a-f0-9]{40}$/, "Full source SHA required");
  assert.equal(sha, env.GITHUB_SHA, "Source must match the dispatched workflow revision");
  const run = env.RELEASE_CI_RUN ?? "";
  assert.match(run, /^[1-9]\d*$/, "Exact CI run ID required");
  const integrity = env.RELEASE_INTEGRITY ?? "";
  assert.match(integrity, /^sha512-[A-Za-z0-9+/]{86}==$/, "Expected tarball SHA-512 required");
  const distTag = version.includes("-rc.") ? "next" : "latest";
  assert.equal(env.RELEASE_DIST_TAG, distTag, "Version/dist-tag mismatch");
  assert.equal(
    env.RELEASE_ACK,
    `${version}:${distTag}`,
    "Explicit publication acknowledgement required",
  );
  for (const name of ["NODE_AUTH_TOKEN", "NPM_TOKEN", "NPM_ID_TOKEN"])
    assert.ok(!env[name], "Long-lived or externally supplied npm credentials forbidden");
  return { version, sha, run, integrity, distTag };
}

export function checkCi(input: ReleaseInput, run: Run, jobs: Job[]): void {
  assert.equal(String(run.id), input.run);
  assert.equal(run.head_sha, input.sha, "CI source mismatch");
  assert.equal(run.repository.full_name, repository);
  assert.equal(run.head_branch, "main");
  assert.equal(run.event, "push");
  assert.equal(run.path, ".github/workflows/ci.yml");
  assert.equal(run.status, "completed");
  assert.equal(run.conclusion, "success", "CI must succeed");
  assert.deepEqual(jobs.map((job) => job.name).sort(), [...requiredJobs].sort());
  for (const job of jobs) {
    assert.equal(job.conclusion, "success", `Failed CI job: ${job.name}`);
    assert.ok(
      job.steps.length > 0 && job.steps.every((step) => step.conclusion === "success"),
      `Unsuccessful/skipped CI step: ${job.name}`,
    );
  }
}

export function checkAvailable(input: ReleaseInput, registry: Registry): void {
  assert.ok(
    !Object.hasOwn(registry.versions, input.version),
    "Version already published; do not retry",
  );
  assert.ok(!Object.hasOwn(registry.time ?? {}, input.version), "Version previously used");
  assert.ok(registry["dist-tags"].latest, "Record an existing latest before publishing");
}

export function checkPublished(
  input: ReleaseInput,
  beforeTags: Registry["dist-tags"],
  version: { version: string; dist: { integrity: string; attestations?: unknown } },
  tags: Registry["dist-tags"],
): void {
  assert.equal(version.version, input.version, "Registry version mismatch");
  assert.equal(version.dist.integrity, input.integrity, "Registry artifact mismatch");
  assert.ok(version.dist.attestations, "Registry provenance metadata required");
  assert.equal(tags[input.distTag], input.version, "Published dist-tag mismatch");
  for (const [tag, previous] of Object.entries(beforeTags))
    if (tag !== input.distTag)
      assert.equal(tags[tag], previous, `Unrelated dist-tag changed: ${tag}`);
}

type PublishedVersion = Parameters<typeof checkPublished>[2];
type PublishedRegistry = { version: PublishedVersion; tags: Registry["dist-tags"] };
export const propagationLimits = Object.freeze({
  timeoutMs: 180_000,
  requestTimeoutMs: 10_000,
  intervalMs: 5_000,
});

class RegistryVerificationError extends Error {
  readonly retryable: boolean;
  readonly retryAfterMs: number;

  constructor(message: string, retryable: boolean, retryAfterMs = 0, options?: ErrorOptions) {
    super(message, options);
    this.retryable = retryable;
    this.retryAfterMs = retryAfterMs;
  }
}

async function readRegistry<T>(
  url: string,
  signal: AbortSignal,
  fetcher: typeof fetch,
): Promise<T> {
  let response: Response;
  try {
    response = await fetcher(url, { method: "GET", redirect: "error", signal });
  } catch (cause) {
    throw new RegistryVerificationError("Registry GET failed", true, 0, { cause });
  }
  if (response.status !== 200) {
    const retryable = [404, 408, 429].includes(response.status) || response.status >= 500;
    const header = response.headers.get("retry-after");
    const wait =
      header === null
        ? 0
        : /^\d+(?:\.\d+)?$/.test(header)
          ? Number(header) * 1_000
          : Date.parse(header) - Date.now();
    await response.body?.cancel().catch(() => {});
    throw new RegistryVerificationError(
      `Registry GET returned HTTP ${response.status}`,
      retryable,
      Number.isFinite(wait) ? Math.max(0, wait) : 0,
    );
  }
  try {
    return (await response.json()) as T;
  } catch (cause) {
    throw new RegistryVerificationError("Registry metadata could not be read", true, 0, { cause });
  }
}

async function registryAttempt(
  input: ReleaseInput,
  fetcher: typeof fetch,
  timeoutMs: number,
): Promise<PublishedRegistry> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new RegistryVerificationError("Registry GET/body deadline exceeded", true);
      controller.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    const reads = Promise.all([
      readRegistry<PublishedVersion>(
        `${registryUrl}circleso/${input.version}`,
        controller.signal,
        fetcher,
      ),
      readRegistry<Registry["dist-tags"]>(
        `${registryUrl}-/package/circleso/dist-tags`,
        controller.signal,
        fetcher,
      ),
    ]).then(([version, tags]) => ({ version, tags }));
    return await Promise.race([reads, timeout]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Poll only public registry GETs; never repeat submission or mutate dist-tags. */
export async function waitForPublished(
  input: ReleaseInput,
  beforeTags: Registry["dist-tags"],
  fetcher: typeof fetch = fetch,
): Promise<PublishedRegistry> {
  const deadline = performance.now() + propagationLimits.timeoutMs;
  let cause: unknown;
  while (performance.now() < deadline) {
    let retryAfterMs = 0;
    try {
      const snapshot = await registryAttempt(
        input,
        fetcher,
        Math.min(propagationLimits.requestTimeoutMs, deadline - performance.now()),
      );
      const { version, tags } = snapshot;
      // Contradictory immutable metadata or changed unrelated tags cannot be
      // explained by ordinary propagation. Fail closed instead of hiding them.
      if (version?.version !== undefined)
        assert.equal(version.version, input.version, "Registry version mismatch");
      if (version?.dist?.integrity !== undefined)
        assert.equal(version.dist.integrity, input.integrity, "Registry artifact mismatch");
      if (tags && typeof tags === "object")
        for (const [tag, previous] of Object.entries(beforeTags))
          if (tag !== input.distTag)
            assert.equal(tags[tag], previous, `Unrelated dist-tag changed: ${tag}`);
      if (
        version?.version === input.version &&
        version.dist?.integrity === input.integrity &&
        version.dist.attestations &&
        tags?.[input.distTag] === input.version
      ) {
        checkPublished(input, beforeTags, version, tags);
        return snapshot;
      }
      cause = new RegistryVerificationError(
        "Registry version, provenance or selected tag is still propagating",
        true,
      );
    } catch (error) {
      if (!(error instanceof RegistryVerificationError) || !error.retryable) throw error;
      cause = error;
      retryAfterMs = error.retryAfterMs;
    }
    const remaining = deadline - performance.now();
    if (remaining <= 0) break;
    const wait = Math.min(remaining, Math.max(propagationLimits.intervalMs, retryAfterMs));
    console.log(`Registry verification pending; retrying GETs in ${Math.ceil(wait / 1_000)}s`);
    await new Promise<void>((resolve) => setTimeout(resolve, wait));
  }
  throw new RegistryVerificationError(
    "Registry verification timed out after 180s. Publication may have succeeded; inspect registry evidence and do not republish.",
    false,
    0,
    { cause },
  );
}

/** The submission boundary runs once, even if verification retries or times out. */
export async function publishAndWait(
  input: ReleaseInput,
  beforeTags: Registry["dist-tags"],
  submit: () => void,
  fetcher: typeof fetch = fetch,
): Promise<PublishedRegistry> {
  submit();
  return waitForPublished(input, beforeTags, fetcher);
}

type TagObject = { ref?: string; object: { type: string; sha: string } };
export async function checkReleaseTag(
  input: ReleaseInput,
  read: (endpoint: string) => Promise<TagObject>,
): Promise<void> {
  let tag = await read(`git/ref/tags/v${input.version}`);
  assert.equal(tag.ref, `refs/tags/v${input.version}`, "An exact tag reference is required");
  for (let depth = 0; depth < 4 && tag.object.type === "tag"; depth++) {
    assert.match(tag.object.sha, /^[a-f0-9]{40}$/, "Invalid annotated tag object");
    tag = await read(`git/tags/${tag.object.sha}`);
  }
  assert.equal(tag.object.type, "commit", "Release tag must resolve to a commit");
  assert.equal(tag.object.sha, input.sha, "Tag must point to the exact tested source");
}

export function checkEvidence(input: ReleaseInput, evidence: Evidence, bytes: Buffer): void {
  assert.equal(evidence.schema, 1);
  assert.equal(evidence.repository, repository);
  assert.equal(evidence.source, input.sha);
  assert.equal(evidence.version, input.version);
  assert.equal(evidence.filename, `circleso-${input.version}.tgz`);
  assert.equal(evidence.integrity, input.integrity);
  assert.equal(evidence.qualification.integrity, input.integrity);
  assert.equal(evidence.qualification.version, input.version);
  assert.equal(evidence.ciRun, input.run);
  assert.equal(
    `sha512-${createHash("sha512").update(bytes).digest("base64")}`,
    input.integrity,
    "Tarball bytes differ from the approved artifact",
  );
}

function git(...args: string[]): string {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}
function npm(...args: string[]): string {
  assert.ok(process.env.npm_execpath, "Run through the npm release scripts");
  return execFileSync(process.execPath, [process.env.npm_execpath, ...args], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    timeout: 180_000,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
async function json<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}
async function save(file: string, value: unknown): Promise<void> {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
}
function clean(): void {
  assert.equal(
    git("status", "--porcelain", "--untracked-files=no"),
    "",
    "Tracked checkout must be clean",
  );
}
async function prepare(): Promise<void> {
  clean();
  const manifest = await json<{ name: string; version: string }>("package.json");
  assert.equal(manifest.name, "circleso");
  const qualification = await json<Evidence["qualification"]>(".cache/package-check.json");
  assert.equal(qualification.version, manifest.version);
  await mkdir(directory, { recursive: true });
  const [packed] = JSON.parse(
    npm("pack", "--json", "--ignore-scripts", "--pack-destination", directory),
  ) as { filename: string; integrity: string; files: Evidence["files"] }[];
  assert.ok(packed);
  assert.equal(
    packed.integrity,
    qualification.integrity,
    "Package changed after consumer qualification",
  );
  const evidence: Evidence = {
    schema: 1,
    repository,
    source: git("rev-parse", "HEAD"),
    tree: git("rev-parse", "HEAD^{tree}"),
    version: manifest.version,
    filename: packed.filename,
    integrity: packed.integrity,
    ciRun: process.env.GITHUB_RUN_ID ?? null,
    ciAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    qualification,
    files: packed.files,
  };
  await save(`${directory}/evidence.json`, evidence);
  console.log(JSON.stringify(evidence));
}

async function get<T>(url: string, token?: string): Promise<T> {
  const response = await fetch(url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        }
      : {},
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  assert.equal(
    response.status,
    200,
    "Release metadata request failed; inspect access/state before retrying",
  );
  return (await response.json()) as T;
}

async function remote(input: ReleaseInput): Promise<{ registry: Registry; attempt: string }> {
  const token = process.env.GH_TOKEN;
  assert.ok(token, "Read-only GitHub token required");
  const api = <T>(endpoint: string) =>
    get<T>(`https://api.github.com/repos/${repository}/${endpoint}`, token);
  const main = await api<{ sha: string }>("commits/main");
  assert.equal(main.sha, input.sha, "Main moved; qualify its new immutable revision first");
  await checkReleaseTag(input, api<TagObject>);
  const run = await api<Run>(`actions/runs/${input.run}`);
  const jobs = await api<{ total_count: number; jobs: Job[] }>(
    `actions/runs/${input.run}/jobs?per_page=100`,
  );
  assert.equal(jobs.total_count, requiredJobs.length);
  checkCi(input, run, jobs.jobs);
  const registry = await get<Registry>(`${registryUrl}circleso`);
  checkAvailable(input, registry);
  return { registry, attempt: String(run.run_attempt) };
}

async function verify(): Promise<{ input: ReleaseInput; registry: Registry; tarball: string }> {
  clean();
  const manifest = await json<{ version: string }>("package.json");
  const input = releaseInput(process.env, manifest.version);
  assert.equal(git("rev-parse", "HEAD"), input.sha);
  const state = await remote(input);
  const evidence = await json<Evidence>(`${directory}/evidence.json`);
  const tarball = `${directory}/circleso-${input.version}.tgz`;
  checkEvidence(input, evidence, await readFile(tarball));
  assert.equal(evidence.tree, git("rev-parse", "HEAD^{tree}"));
  assert.equal(
    evidence.ciAttempt,
    state.attempt,
    "Artifact must belong to this successful CI attempt",
  );
  console.log(`Verified ${input.version} from ${input.sha}; CI ${input.run}; ${input.integrity}`);
  return { input, registry: state.registry, tarball };
}

async function publish(): Promise<void> {
  const { input, registry, tarball } = await verify();
  assert.equal(process.version, "v24.22.1", "Publisher Node pin changed; requalify it");
  assert.equal(npm("--version").trim(), "11.19.1", "Publisher npm pin changed; requalify it");
  assert.ok(
    process.env.ACTIONS_ID_TOKEN_REQUEST_URL && process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN,
    "OIDC capability required; no token fallback",
  );
  await save(`${directory}/registry-before.json`, { tags: registry["dist-tags"], ...input });
  // Publish the downloaded bytes once. No directory packing, rebuilding, spec download or retry.
  const { version, tags } = await publishAndWait(input, registry["dist-tags"], () => {
    process.stdout.write(
      npm(
        "publish",
        `./${tarball}`,
        "--ignore-scripts",
        "--access=public",
        "--registry=https://registry.npmjs.org/",
        `--tag=${input.distTag}`,
        "--provenance",
        "--fetch-retries=0",
      ),
    );
  });
  await save(`${directory}/published.json`, {
    ...input,
    tags,
    dist: version.dist,
  });
  console.log(
    "Registry digest, provenance metadata and intended dist-tag verified; verify installed attestations separately",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const mode = process.argv[2];
    if (mode === "prepare") await prepare();
    else if (mode === "verify") await verify();
    else if (mode === "publish") await publish();
    else if (mode === "guard") {
      console.error(
        "Directory publishing is disabled. Use the manual publish.yml workflow and its qualified CI tarball.",
      );
      process.exitCode = 1;
    } else assert.fail("Expected prepare, verify, publish or guard");
  } catch (cause) {
    // Never print child-process errors: they can contain credentials or OIDC URLs.
    console.error(
      "Release gate failed. Inspect version, source, CI, tag, digest and publisher access. Do not blindly retry publication.",
    );
    if (cause instanceof assert.AssertionError || cause instanceof RegistryVerificationError)
      console.error(cause.message);
    process.exitCode = 1;
  }
}
