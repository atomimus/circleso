import { readdir, readFile } from "node:fs/promises";
import { parseYaml } from "@redocly/openapi-core";
import { expect, it } from "vitest";

type Step = {
  uses?: string;
  run?: string;
  with?: Record<string, unknown>;
  env?: Record<string, unknown>;
};
type Workflow = {
  on: Record<string, unknown>;
  permissions: Record<string, string>;
  concurrency: { "cancel-in-progress": boolean };
  jobs: Record<
    string,
    {
      "timeout-minutes": number;
      permissions?: Record<string, string>;
      environment?: unknown;
      steps: Step[];
    }
  >;
};

it("keeps validation workflows bounded, unprivileged and pinned without publishing paths", async () => {
  const files = (await readdir(".github/workflows")).filter(
    (file) => /\.ya?ml$/.test(file) && file !== "publish.yml",
  );
  expect(files.length).toBeGreaterThan(0);
  for (const file of files) {
    const source = await readFile(`.github/workflows/${file}`, "utf8");
    const workflow = parseYaml(source) as Workflow;
    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(workflow.concurrency["cancel-in-progress"]).toBe(true);
    expect(Object.keys(workflow.on)).not.toEqual(expect.arrayContaining(["pull_request_target"]));
    expect(Object.keys(workflow.on)).not.toEqual(expect.arrayContaining(["workflow_run"]));
    expect(source).not.toMatch(/id-token:|NODE_AUTH_TOKEN|NPM_TOKEN/);
    if (file !== "live-integration.yml") expect(source).not.toMatch(/secrets\s*[.[]/);
    else {
      expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"]);
      expect(Object.keys(workflow.jobs)).toEqual(["integration"]);
      expect(workflow.jobs.integration).toHaveProperty("if", "github.ref == 'refs/heads/main'");
      expect(source.match(/secrets\.[\w]+/g)).toEqual(["secrets.CIRCLE_TEST_MEMBER_TOKEN"]);
    }
    for (const job of Object.values(workflow.jobs)) {
      expect(job["timeout-minutes"]).toBeGreaterThan(0);
      expect(job["timeout-minutes"]).toBeLessThanOrEqual(20);
      expect(job.permissions).toBeUndefined();
      if (file === "live-integration.yml") expect(job.environment).toBe("circle-integration");
      else expect(job.environment).toBeUndefined();
      for (const step of job.steps) {
        if (step.uses) expect(step.uses).toMatch(/^actions\/[\w-]+@[a-f0-9]{40}$/);
        if (step.uses?.startsWith("actions/checkout@")) {
          expect(step.with?.["persist-credentials"]).toBe(false);
        }
        expect(step.with?.["registry-url"]).toBeUndefined();
        if (file === "ci.yml" && step.run === "npm run release:prepare") {
          expect(job.permissions).toBeUndefined();
        } else
          expect(step.run ?? "").not.toMatch(/\b(publish|release|dist-tag)\b|git\s+(push|tag)\b/);
        if (JSON.stringify(step.env ?? {}).includes("secrets.")) {
          expect(file).toBe("live-integration.yml");
          expect(step.run).toBe("npm run test:integration -- --require-live");
          expect(step.env?.CIRCLE_LIVE_TESTS).toBe("read-only");
          // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub expression
          expect(step.env?.CIRCLE_TEST_COMMUNITY_ACK).toBe("${{ inputs.community_ack }}");
          expect(step.env?.CIRCLE_TEST_MEMBER_TOKEN).toBe(
            // biome-ignore lint/suspicious/noTemplateCurlyInString: literal GitHub expression
            "${{ secrets.CIRCLE_TEST_MEMBER_TOKEN }}",
          );
        }
      }
    }
  }
});

it("keeps live spec downloads out of public validation and requires deliberate main dispatch", async () => {
  const offline = parseYaml(await readFile(".github/workflows/ci.yml", "utf8")) as Workflow;
  const live = parseYaml(await readFile(".github/workflows/live-spec.yml", "utf8")) as Workflow;
  expect(Object.keys(offline.on)).toContain("push");
  expect(Object.keys(live.on)).toEqual(["workflow_dispatch"]);
  expect(live.jobs.compare).toHaveProperty("if", "github.ref == 'refs/heads/main'");
  const { scripts } = JSON.parse(await readFile("package.json", "utf8")) as {
    scripts: Record<string, string>;
  };
  const gate = scripts["validate:ci"] ?? "";
  for (const command of [
    "lint",
    "typecheck",
    "test",
    "gen:check",
    "coverage:check",
    "docs:check",
    "build",
    "pack:check",
    "test:package",
  ]) {
    expect(gate).toMatch(new RegExp(`npm (?:run )?${command}(?: &&|$)`));
  }
  expect(gate).not.toMatch(/spec:|gen:types|coverage:write|if-present/);
  expect(scripts["pack:check"]).toContain("--ignore-scripts");
  expect(scripts["pack:check"]).toContain("--dry-run");
  expect(
    Object.values(offline.jobs)
      .flatMap((job) => job.steps)
      .some((step) => step.run === "npm run validate:ci"),
  ).toBe(true);
  expect(offline.jobs.browsers).toHaveProperty("strategy.matrix.node", ["22.x", "24.x"]);
  expect(
    offline.jobs.browsers?.steps.some(
      (step) =>
        step.run ===
        "node node_modules/playwright/cli.js install --with-deps chromium firefox webkit",
    ),
  ).toBe(true);
  expect(offline.jobs.browsers?.steps.some((step) => step.run === "npm run test:browser")).toBe(
    true,
  );
});
