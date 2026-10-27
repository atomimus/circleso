import { createAdmin, richText } from "circleso/admin";
import { createHeadless } from "circleso/headless";

// Compile-only recipe: credentials, identities and IDs are supplied by the caller.
export async function richTextExample(
  adminToken: string,
  accessToken: string,
  mentionSgid: string,
  signedId: string,
) {
  const content = richText.body(
    [
      richText.paragraph(
        richText.text("Hello "),
        richText.mention(mentionSgid),
        richText.hardBreak(),
        richText.link("Guide", "https://example.com/guide"),
      ),
    ],
    { attachments: [richText.signedAttachment(signedId)] },
  );
  const admin = createAdmin({ token: adminToken, retries: { retries: 0 } });
  const member = createHeadless({ accessToken, retries: { retries: 0 } });
  await admin.posts.create({ name: "Example", space_id: 123, tiptap_body: content });
  await member.comments.create(123, { comment: { tiptap_body: content } });
  return member.chatRooms.messages.create("room-uuid", { rich_text_body: content });
}
