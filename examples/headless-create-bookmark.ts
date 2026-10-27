import { createHeadless } from "circleso/headless";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const recordIdText = requireEnv("CIRCLE_BOOKMARK_RECORD_ID");
const recordId = Number(recordIdText);
if (!/^\d+$/.test(recordIdText) || !Number.isSafeInteger(recordId) || recordId < 1) {
  throw new Error("CIRCLE_BOOKMARK_RECORD_ID must be a positive safe integer.");
}

const bookmarkType = process.env.CIRCLE_BOOKMARK_TYPE ?? "post";
if (bookmarkType !== "post" && bookmarkType !== "comment") {
  throw new Error("CIRCLE_BOOKMARK_TYPE must be 'post' or 'comment'.");
}

const headless = createHeadless({
  accessToken: requireEnv("CIRCLE_HEADLESS_TOKEN"),
  retries: { retries: 0 },
  timeoutMs: 10_000,
});

try {
  const data = await headless.bookmarks.create({
    record_id: recordId,
    bookmark_type: bookmarkType,
  });

  console.log(data ? "Bookmark created." : "Bookmark request completed.");
} catch {
  console.error("Bookmark creation failed; reconcile the intended change before repeating.");
  process.exit(1);
}
