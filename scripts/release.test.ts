import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { parseYaml } from "@redocly/openapi-core";
import { expect, it } from "vitest";
import {
  checkAvailable,
  checkCi,
  checkEvidence,
  checkPublished,
  checkReleaseTag,
  type Evidence,
  releaseInput,
  requiredJobs,
} from "./release";

const sha = "a".repeat(40);
const bytes = Buffer.from("qualified fixture bytes");
const integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
const env = {
  GITHUB_EVENT_NAME: "workflow_dispatch",
  GITHUB_REPOSITORY: "atomimus/circleso",
  GITHUB_REF: "refs/heads/main",
  GITHUB_SHA: sha,
  RUNNER_ENVIRONMENT: "github-hosted",
  RELEASE_VERSION: "1.0.0-rc.1",
  RELEASE_SOURCE: sha,
  RELEASE_CI_RUN: "123",
  RELEASE_INTEGRITY: integrity,
  RELEASE_DIST_TAG: "next",
  RELEASE_ACK: "1.0.0-rc.1:next",
};
const input = releaseInput(env, env.RELEASE_VERSION);
const run = {
  id: 123,
  run_attempt: 1,
  head_sha: sha,
  head_branch: "main",
  event: "push",
  path: ".github/workflows/ci.yml",
  status: "completed",
  conclusion: "success",
  repository: { full_name: "atomimus/circleso" },
};
const jobs = requiredJobs.map((name) => ({
  name,
  conclusion: "success",
  steps: [{ conclusion: "success" }],
}));
const registry = { versions: {}, "dist-tags": { latest: "0.3.0" } };
const evidence: Evidence = {
  schema: 1,
  repository: "atomimus/circleso",
  source: sha,
  tree: "b".repeat(40),
  version: input.version,
  filename: `circleso-${input.version}.tgz`,
  integrity,
  ciRun: "123",
  ciAttempt: "1",
  qualification: { version: input.version, integrity },
  files: [],
};
type Step = { uses?: string; run?: string; with?: Record<string, unknown> };
type Job = {
  if: string;
  "runs-on": string;
  "timeout-minutes": number;
  environment?: string | { name: string; url: string };
  needs?: string;
  permissions: Record<string, string>;
  steps: Step[];
};
type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: unknown;
  jobs: { qualify: Job; publish: Job };
};

it("accepts exact RC/next and stable/latest manual identities", () => {
  expect(input.distTag).toBe("next");
  expect(
    releaseInput(
      { ...env, RELEASE_VERSION: "1.0.0", RELEASE_DIST_TAG: "latest", RELEASE_ACK: "1.0.0:latest" },
      "1.0.0",
    ).distTag,
  ).toBe("latest");
});

it("accepts the authorized 1.0.1 patch only with its exact latest acknowledgement", () => {
  const patch = {
    ...env,
    RELEASE_VERSION: "1.0.1",
    RELEASE_DIST_TAG: "latest",
    RELEASE_ACK: "1.0.1:latest",
  };
  expect(releaseInput(patch, "1.0.1")).toEqual({ ...input, version: "1.0.1", distTag: "latest" });
  for (const change of [
    { RELEASE_DIST_TAG: "next" },
    { RELEASE_ACK: "1.0.0:latest" },
    { RELEASE_ACK: "1.0.1:next" },
    { RELEASE_VERSION: "1.0.0" },
  ])
    expect(() => releaseInput({ ...patch, ...change }, "1.0.1")).toThrow();
});

it.each([
  ["GITHUB_EVENT_NAME", "push"],
  ["GITHUB_REF", "refs/tags/v1.0.0-rc.1"],
  ["GITHUB_REPOSITORY", "fork/circleso"],
  ["GITHUB_SHA", "b".repeat(40)],
  ["RUNNER_ENVIRONMENT", "self-hosted"],
  ["RELEASE_SOURCE", "main"],
  ["RELEASE_SOURCE", "$(injection)"],
  ["RELEASE_CI_RUN", "123;echo"],
  ["RELEASE_INTEGRITY", "sha512-wrong"],
  ["RELEASE_DIST_TAG", "latest"],
  ["RELEASE_ACK", "yes"],
  ["RELEASE_VERSION", "1.0.0-rc.2"],
  ["NODE_AUTH_TOKEN", "synthetic"],
  ["NPM_TOKEN", "synthetic"],
  ["NPM_ID_TOKEN", "synthetic"],
])("rejects changed manual identity/input %s", (key, value) => {
  expect(() => releaseInput({ ...env, [key]: value }, env.RELEASE_VERSION)).toThrow();
});
it.each([
  "1.0.0-rc.0",
  "1.0.0-rc.01",
  "1.0.0-beta.1",
  "1.0.2",
  "1.1.0",
  "1.0.01",
  "1.0.1-rc.1",
  "1.0.1+build",
  "2.0.0",
  "1.0.0+build",
])("rejects versions beyond this release scope: %s", (version) => {
  expect(() => releaseInput({ ...env, RELEASE_VERSION: version }, version)).toThrow();
});

it("requires exact successful source run and every supported job/step", () => {
  expect(() => checkCi(input, run, jobs)).not.toThrow();
  for (const change of [
    { head_sha: "b".repeat(40) },
    { event: "pull_request" },
    { conclusion: "failure" },
    { path: ".github/workflows/other.yml" },
    { head_branch: "other" },
    { id: 124 },
    { status: "in_progress" },
    { repository: { full_name: "fork/circleso" } },
  ])
    expect(() => checkCi(input, { ...run, ...change }, jobs)).toThrow();
  expect(() => checkCi(input, run, jobs.slice(1))).toThrow();
  expect(() => checkCi(input, run, [...jobs, ...jobs])).toThrow();
  for (const conclusion of ["failure", "skipped", "cancelled", "neutral"])
    expect(() =>
      checkCi(
        input,
        run,
        jobs.map((job, i) => (i ? job : { ...job, steps: [{ conclusion }] })),
      ),
    ).toThrow();
  expect(() =>
    checkCi(
      input,
      run,
      jobs.map((job) => ({ ...job, steps: [] })),
    ),
  ).toThrow();
});

it("rejects existing/previously used versions and missing latest snapshots", () => {
  expect(() => checkAvailable(input, registry)).not.toThrow();
  expect(() =>
    checkAvailable(input, { ...registry, versions: { [input.version]: { dist: { integrity } } } }),
  ).toThrow();
  expect(() =>
    checkAvailable(input, { ...registry, time: { [input.version]: "removed" } }),
  ).toThrow();
  expect(() => checkAvailable(input, { versions: {}, "dist-tags": {} })).toThrow();
});

it("verifies exact published metadata while preserving every unrelated dist-tag", () => {
  const patch = { ...input, version: "1.0.1", distTag: "latest" as const };
  const beforeTags = { latest: "1.0.0", next: "1.0.0-rc.1", custom: "0.3.0" };
  const version = { version: "1.0.1", dist: { integrity, attestations: { url: "fixture" } } };
  const tags = { ...beforeTags, latest: "1.0.1" };
  expect(() => checkPublished(patch, beforeTags, version, tags)).not.toThrow();
  for (const changed of [
    { ...version, version: "1.0.0" },
    { ...version, dist: { ...version.dist, integrity: "substituted" } },
    { ...version, dist: { integrity } },
  ])
    expect(() => checkPublished(patch, beforeTags, changed, tags)).toThrow();
  for (const changed of [
    { ...tags, latest: "1.0.0" },
    { ...tags, next: "1.0.1" },
    { latest: "1.0.1", next: "1.0.0-rc.1" },
  ])
    expect(() => checkPublished(patch, beforeTags, version, changed)).toThrow();
  // A release candidate must still preserve the pre-existing stable tag.
  expect(() =>
    checkPublished(
      input,
      beforeTags,
      { ...version, version: input.version },
      {
        ...beforeTags,
        latest: input.version,
        next: input.version,
      },
    ),
  ).toThrow();
});

it("resolves exact lightweight and annotated tags without branch-name fallback", async () => {
  const ref = `refs/tags/v${input.version}`;
  const calls: string[] = [];
  await checkReleaseTag(input, async (endpoint) => {
    calls.push(endpoint);
    return { ref, object: { type: "commit", sha } };
  });
  expect(calls).toEqual([`git/ref/tags/v${input.version}`]);
  const tagSha = "c".repeat(40);
  await checkReleaseTag(input, async (endpoint) => {
    calls.push(endpoint);
    return endpoint.startsWith("git/ref/")
      ? { ref, object: { type: "tag", sha: tagSha } }
      : { object: { type: "commit", sha } };
  });
  expect(calls.slice(1)).toEqual([`git/ref/tags/v${input.version}`, `git/tags/${tagSha}`]);
  for (const response of [
    { ref: `refs/heads/v${input.version}`, object: { type: "commit", sha } },
    { ref, object: { type: "commit", sha: "b".repeat(40) } },
    { ref, object: { type: "tree", sha } },
    { ref, object: { type: "tag", sha: "../other" } },
    { ref, object: { type: "tag", sha: tagSha } },
  ])
    await expect(checkReleaseTag(input, async () => response)).rejects.toThrow();
  await expect(
    checkReleaseTag(input, async () => {
      throw new Error("404 fixture");
    }),
  ).rejects.toThrow("404 fixture");
});

it("rejects corrupted bytes, substituted artifacts and unqualified evidence", () => {
  expect(() => checkEvidence(input, evidence, bytes)).not.toThrow();
  expect(() => checkEvidence(input, evidence, Buffer.from("different bytes"))).toThrow();
  for (const change of [
    { source: "b".repeat(40) },
    { filename: "../../other.tgz" },
    { version: "1.0.0" },
    { ciRun: "124" },
    { integrity: "wrong" },
    { qualification: { version: input.version, integrity: "wrong" } },
    { repository: "fork/circleso" },
    { schema: 2 },
  ])
    expect(() => checkEvidence(input, { ...evidence, ...change } as Evidence, bytes)).toThrow();
});

it("runs the native Node directory-publish guard without regeneration or npm publication", async () => {
  const before = execFileSync("git", ["diff", "--", "api/specs", "src/generated"], {
    encoding: "utf8",
  });
  const result = spawnSync(process.execPath, ["scripts/release.ts", "guard"], { encoding: "utf8" });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("Directory publishing is disabled");
  expect(
    execFileSync("git", ["diff", "--", "api/specs", "src/generated"], { encoding: "utf8" }),
  ).toBe(before);
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  expect(manifest.scripts.prepublishOnly).toBe("node ./scripts/release.ts guard");
});

it("confines OIDC to manually dispatched publication after unprivileged qualification", async () => {
  const source = await readFile(".github/workflows/publish.yml", "utf8");
  const workflow = parseYaml(source) as Workflow;
  expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
  expect(workflow.permissions).toEqual({ contents: "read" });
  expect(workflow.concurrency).toEqual({
    group: "circleso-npm-publication",
    "cancel-in-progress": false,
  });
  expect(Object.keys(workflow.jobs)).toEqual(["qualify", "publish"]);
  expect(workflow.jobs.qualify.permissions).toEqual({ contents: "read", actions: "read" });
  expect(workflow.jobs.qualify.environment).toBeUndefined();
  expect(workflow.jobs.publish.permissions).toEqual({
    contents: "read",
    actions: "read",
    "id-token": "write",
  });
  expect(workflow.jobs.publish.environment).toEqual({
    name: "npm-release",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: literal workflow expression
    url: "https://www.npmjs.com/package/circleso/v/${{ inputs.version }}",
  });
  expect(workflow.jobs.publish.needs).toBe("qualify");
  expect(source).not.toMatch(
    /secrets\.|NODE_AUTH_TOKEN|NPM_TOKEN|spec:sync|gen:types|dist-tag add|npm publish|git tag/,
  );
  for (const job of Object.values(workflow.jobs)) {
    expect(job.if).toBe(
      "github.ref == 'refs/heads/main' && github.repository == 'atomimus/circleso'",
    );
    expect(job["runs-on"]).toBe("ubuntu-24.04");
    expect(job["timeout-minutes"]).toBeLessThanOrEqual(20);
    for (const step of job.steps) {
      if (step.uses) expect(step.uses).toMatch(/^actions\/[\w-]+@[a-f0-9]{40}$/);
      if (step.uses?.startsWith("actions/checkout@"))
        expect(step.with?.["persist-credentials"]).toBe(false);
      if (step.uses?.startsWith("actions/setup-node@")) {
        expect(step.with?.["node-version"]).toBe("24.22.1");
        expect(step.with?.["package-manager-cache"]).toBe(false);
        expect(step.with?.["registry-url"]).toBeUndefined();
      }
      if (step.uses?.startsWith("actions/download-artifact@")) {
        expect(step.with?.["digest-mismatch"]).toBe("error");
        // biome-ignore lint/suspicious/noTemplateCurlyInString: literal workflow expression
        expect(step.with?.["run-id"]).toBe("${{ inputs.ci_run }}");
      }
      expect(step.run ?? "").not.toContain("${{");
    }
  }
  const privilegedRuns = workflow.jobs.publish.steps.flatMap((s: { run?: string }) =>
    s.run ? [s.run] : [],
  );
  expect(privilegedRuns).toEqual(["npm run release:publish"]);
  expect(
    workflow.jobs.qualify.steps.some((s: { run?: string }) => s.run === "npm run test:browser"),
  ).toBe(true);
});
