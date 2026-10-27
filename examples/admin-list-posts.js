// ESM: node --env-file-if-exists=examples/.env examples/admin-list-posts.js
// Requires a built/installed circleso package; no dotenv dependency.
import { createAdmin } from "circleso/admin";

const token = process.env.CIRCLE_ADMIN_TOKEN;
if (!token) throw new Error("Missing CIRCLE_ADMIN_TOKEN");
const admin = createAdmin({ token, timeoutMs: 10_000 });
try {
  const data = await admin.posts.list({ page: 1, per_page: 5 });
  console.log(`Fetched ${data?.records?.length ?? 0} posts.`);
} catch {
  console.error("Admin read failed; inspect SDK context through a redacted application handler.");
  process.exitCode = 1;
}
