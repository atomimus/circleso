import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { CircleConfigError, createHeadless } from "circleso/headless";
import { allowLiveRequest, liveConfig } from "./integration-policy.mjs";
import { integrationWorkflow } from "./integration-workflow.mjs";

// Only executed by the explicit opt-in runner, against the actual installed package.
try {
  const config = liveConfig(process.env);
  assert.ok(config);
  const ledgerPath = process.env.CIRCLE_LIVE_LEDGER;
  assert.ok(ledgerPath);
  let ownedBookmark;
  const ledger = {
    communityId: config.communityId,
    memberId: config.memberId,
    postId: config.postId,
    state: "read-only",
    bookmarkId: undefined,
  };
  const persist = () =>
    writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`, { mode: 0o600 });
  const member = createHeadless({
    baseUrl: config.baseUrl,
    accessToken: config.token,
    retries: { retries: 0 },
    timeoutMs: 10_000,
    fetcher: async (input, init) => {
      const request = new Request(input, init);
      if (!allowLiveRequest(config, request, ownedBookmark))
        throw new CircleConfigError("Live request outside explicit test scope");
      return fetch(request, { redirect: "error", credentials: "omit" });
    },
  });
  await integrationWorkflow(member, config, ledger, persist, (id) => {
    ownedBookmark = id;
  });
  console.log(
    "VERIFIED live read-only: configured member identity and fixed space/community match. No response bodies printed.",
  );
  if (config.writes) {
    console.log(
      "VERIFIED live bookmark fixture: owned ID recorded and deleted; zero retries. No financial or messaging operations.",
    );
  } else
    console.log(
      "SKIPPED live writes: explicit bookmark/disposable-account flags absent; write behavior UNVERIFIED.",
    );
} catch {
  console.error(
    "Live integration FAILED. Inspect the private fixture ledger for uncertain creation/cleanup; reconcile only owned IDs. Diagnostic bodies, URLs and causes are suppressed.",
  );
  process.exitCode = 1;
}
