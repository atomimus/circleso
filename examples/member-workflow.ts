// Complete server recipes. Import and invoke the intended function explicitly.
// No function runs on import. Authorize the member in your application first.
import { readFile, stat } from "node:fs/promises";
import { createAdmin } from "circleso/admin";
import { createAuth } from "circleso/auth";
import { createHeadless, richText } from "circleso/headless";

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function positiveId(name: string): number {
  const value = env(name);
  const id = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(id) || id < 1)
    throw new Error(`${name} must be a positive safe integer`);
  return id;
}

function member() {
  return createHeadless({
    accessToken: env("CIRCLE_HEADLESS_TOKEN"),
    timeoutMs: 10_000,
    retries: { retries: 0 },
  });
}

// Read-only common operations, bounded to two pages/40 items.
export async function readFromEnvironment() {
  const admin = createAdmin({ token: env("CIRCLE_ADMIN_TOKEN"), timeoutMs: 10_000 });
  const posts = [];
  for await (const post of admin.iter.posts({ maxPages: 2, maxItems: 40, per_page: 20 }))
    posts.push(post);
  const bookmarks = await member().bookmarks.list({ page: 1, per_page: 20 });
  return { posts, bookmarks };
}

// Identity must come from a trusted, authorized server session, never arbitrary browser input.
// Return credentials only to the application's secure session layer; never log them.
export async function issueForVerifiedMember(verifiedCommunityMemberId: number) {
  const auth = createAuth({
    token: env("CIRCLE_HEADLESS_AUTH_TOKEN"),
    timeoutMs: 10_000,
    retries: { retries: 0 },
  });
  const tokens = await auth.authToken.create({ community_member_id: verifiedCommunityMemberId });
  if (!tokens?.access_token || !tokens.refresh_token) throw new Error("Missing issued tokens");
  return tokens;
}

// Explicit mutation: upload and attach to a new Member post in the chosen space.
// A failure can leave a blob or an uncertain post; reconcile before calling again.
export async function uploadAndCreatePost() {
  // Use an application-controlled regular file; do not accept arbitrary remote paths.
  const filename = env("CIRCLE_UPLOAD_PATH");
  const info = await stat(filename);
  if (!info.isFile() || info.size > 20 * 1024 * 1024)
    throw new Error("Expected a file up to 20 MiB");
  const bytes = await readFile(filename);
  const client = member();
  const uploaded = await client.directUploads.upload(bytes, {
    key: "",
    filename: env("CIRCLE_UPLOAD_FILENAME"),
    contentType: process.env.CIRCLE_UPLOAD_CONTENT_TYPE ?? "application/octet-stream",
    maxBytes: 20 * 1024 * 1024,
    timeoutMs: 60_000,
  });
  const content = richText.body([richText.paragraph(richText.text(env("CIRCLE_POST_TEXT")))], {
    attachments: [richText.signedAttachment(uploaded.signed_id)],
  });
  return client.posts.create(positiveId("CIRCLE_SPACE_ID"), {
    name: env("CIRCLE_POST_TITLE"),
    tiptap_body: content,
  });
}

// Explicit session change: only forward from a compatible trusted public origin.
// Node Fetch exposes separate Set-Cookie values; browsers cannot read these headers.
export async function forwardMemberCookies(trustedCommunityOrigin: string): Promise<Response> {
  const client = createHeadless({
    baseUrl: trustedCommunityOrigin,
    accessToken: env("CIRCLE_HEADLESS_TOKEN"),
    timeoutMs: 10_000,
    retries: { retries: 0 },
  });
  const result = await client.cookies.createWithResponse({ credentials: "omit" });
  const headers = new Headers({ "cache-control": "no-store" });
  for (const cookie of result.response.headers.getSetCookie()) headers.append("set-cookie", cookie);
  return new Response(null, { status: 204, headers });
}
