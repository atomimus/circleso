import type { AdminApi } from "./admin";
import type { paths as AdminPaths, components as AdminSchemas } from "./generated/admin-v2";
import type {
  paths as MemberPaths,
  components as MemberSchemas,
} from "./generated/headless-client-v1";
import type { HeadlessApi } from "./headless";
import { type RichTextBody, richText } from "./index";

// Compile only: common output fits actual generated schemas, no casts or any.
const content = richText.body(
  [
    richText.paragraph(
      richText.text("Hello "),
      richText.mention("synthetic-sgid"),
      richText.hardBreak(),
      richText.link("Guide", "https://example.com"),
    ),
  ],
  { attachments: [richText.signedAttachment("synthetic-signed-id")] },
);
const adminSchema: AdminSchemas["schemas"]["rich_text_body"] = content;
const memberSchema: MemberSchemas["schemas"]["rich_text_body"] = content;
const post: NonNullable<
  AdminPaths["/api/admin/v2/posts"]["post"]["requestBody"]
>["content"]["application/json"] = { name: "Example", space_id: 1, tiptap_body: content };
const comment: MemberPaths["/api/headless/v1/posts/{post_id}/comments"]["post"]["requestBody"]["content"]["application/json"] =
  { comment: { tiptap_body: content } };
void [adminSchema, memberSchema, post, comment];

export async function richTextContracts(admin: AdminApi, member: HeadlessApi) {
  await admin.posts.create({ name: "Example", space_id: 1, tiptap_body: content });
  await admin.posts.update("1", { tiptap_body: content });
  await admin.messages.create({ user_email: "synthetic@example.com", rich_text_body: content });
  await member.posts.create(1, { name: "Example", tiptap_body: content });
  await member.comments.create(1, { comment: { tiptap_body: content } });
  await member.comments.update(1, 2, { comment: { tiptap_body: content } });
  await member.comments.replies.create("2", { comment: { tiptap_body: content } });
  await member.chatRooms.messages.create("synthetic-room", { rich_text_body: content });
  await member.chatRooms.messages.update("synthetic-room", "2", { rich_text_body: content });
  await admin.chatRoomMessageImports.create({
    chat_room_uuid: "synthetic-room",
    user_email: "synthetic@example.com",
    sent_at: "2020-01-01T00:00:00Z",
    rich_text_body: content,
  });
  await admin.contactNotes.create("1", { tiptap_body: content });
  const extension = richText.unchecked({
    body: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Extension" }] },
      ],
    },
  });
  await admin.posts.create({ name: "Example", space_id: 1, tiptap_body: extension });
  await member.comments.create(1, { comment: { tiptap_body: extension } });
  await member.chatRooms.messages.update("room", "2", { rich_text_body: extension });
  // @ts-expect-error extensions explicitly do not claim to be validated common content
  const checked: RichTextBody = extension;
  void checked;
  // @ts-expect-error signed attachment construction is explicit
  richText.body([], { attachments: ["synthetic-id"] });
  // @ts-expect-error inline nodes must be wrapped in a paragraph
  richText.body([richText.text("Hello")]);
  // @ts-expect-error paragraphs accept only inline nodes
  richText.paragraph(richText.paragraph());
  // @ts-expect-error mention attributes require an SGID
  richText.paragraph({ type: "mention", attrs: {} });
  richText.paragraph({
    type: "text",
    text: "Link",
    // @ts-expect-error link mark requires both documented attributes
    marks: [{ type: "link", attrs: { href: "https://example.com" } }],
  });
  await member.chatRooms.messages.update("room", "2", {
    // @ts-expect-error arbitrary trees need the explicit escape hatch
    rich_text_body: { body: { type: "doc", content: [{ type: "custom" }] } },
  });
  // @ts-expect-error recipient requirements survive the compatibility layer
  await admin.messages.create({ rich_text_body: content });
  // @ts-expect-error unrelated required import inputs survive
  await admin.chatRoomMessageImports.create({ rich_text_body: content });
  await member.raw.PUT("/api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}", {
    params: { path: { chat_room_uuid: "room", id: "2" } },
    // @ts-expect-error raw object-only schema remains exact
    body: { rich_text_body: content },
  });
}
