const path = require("node:path");
const { createAdmin } = require("circleso/admin");

require("dotenv").config({ path: path.resolve(__dirname, ".env") });

const token = process.env.CIRCLE_API_V2_TOKEN;

if (!token) {
  console.error("Missing CIRCLE_API_V2_TOKEN in environment.");
  process.exit(1);
}

const admin = createAdmin({ token });

const formatPost = (post) => {
  const id = post?.id ?? "unknown";
  const name = post?.name ?? "untitled";
  const url = post?.url ?? "";
  return `${id} | ${name}${url ? ` | ${url}` : ""}`;
};

(async () => {
  try {
    const data = await admin.posts.list({ page: 1, per_page: 5 });
    const records = data?.records ?? [];
    console.log(`Fetched ${records.length} posts.`);
    for (const post of records) {
      console.log(formatPost(post));
    }
  } catch (error) {
    const details = {
      message: error?.message,
      status: error?.status ?? error?.response?.status,
      requestId: error?.requestId,
      body: error?.parsedJson ?? error?.bodyText ?? error?.response?.data,
    };
    console.error("Failed to list posts.", details);
    process.exit(1);
  }
})();
