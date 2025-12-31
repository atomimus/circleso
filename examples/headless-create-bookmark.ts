import { createHeadless } from "circleso/headless";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}.`);
  }
  return value;
}

const recordId = Number.parseInt(requireEnv("CIRCLE_BOOKMARK_RECORD_ID"), 10);
if (!Number.isFinite(recordId)) {
  throw new Error("CIRCLE_BOOKMARK_RECORD_ID must be a number.");
}

const bookmarkType = process.env.CIRCLE_BOOKMARK_TYPE ?? "post";
if (bookmarkType !== "post" && bookmarkType !== "comment") {
  throw new Error("CIRCLE_BOOKMARK_TYPE must be 'post' or 'comment'.");
}

const headless = createHeadless({
  accessToken: requireEnv("CIRCLE_HEADLESS_TOKEN"),
});

try {
  const data = await headless.bookmarks.create({
    record_id: recordId,
    bookmark_type: bookmarkType,
  });

  console.log(JSON.stringify(data, null, 2));
} catch (error) {
  console.error(error);
  process.exit(1);
}
