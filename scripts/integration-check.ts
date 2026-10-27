import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { liveConfig } from "./integration-policy";

try {
  const config = liveConfig(process.env);
  if (!config) {
    console.log(
      "SKIPPED Circle live integration: CIRCLE_LIVE_TESTS and dedicated test-community prerequisites absent. Live behavior UNVERIFIED; no Circle requests made.",
    );
    if (process.argv.includes("--require-live")) process.exitCode = 1;
  } else {
    await mkdir(".cache/integration", { recursive: true });
    const ledger = path.resolve(".cache/integration", `${randomUUID()}.json`);
    const result = spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/package-check.ts", "--live"],
      {
        stdio: "inherit",
        timeout: 240_000,
        env: { ...process.env, CIRCLE_LIVE_LEDGER: ledger },
      },
    );
    process.exitCode = result.status ?? 1;
  }
} catch {
  // Configuration can contain credentials; never dump errors, environment or cause chains.
  console.error(
    "Live integration FAILED: check the documented explicit test-community configuration. No credentials are printed.",
  );
  process.exitCode = 1;
}
