# Rich text

`richText` is available from `circleso`, `circleso/admin` and `circleso/headless`.
It builds Circle's `{ body: { type: "doc", content: [...] }, attachments?: [...] }`
envelope. Pass that envelope as `tiptap_body` or `rich_text_body` at the location
specified by the operation. Do not JSON.stringify it or pass only its inner `body`.

```ts
import { createAdmin, richText } from "circleso/admin";

export async function createPost(token: string, mentionSgid: string) {
  const admin = createAdmin({ token, retries: { retries: 0 } });
  const content = richText.body([
    richText.paragraph(
      richText.text("Hello "),
      richText.mention(mentionSgid),
      richText.hardBreak(),
      richText.link("Read the guide", "https://example.com/guide"),
    ),
    richText.paragraph(richText.text("A second paragraph.")),
  ]);
  return admin.posts.create({ space_id: 123, name: "Welcome", tiptap_body: content });
}
```

For a Member comment the envelope is nested under `comment.tiptap_body`. For a
message it is `rich_text_body`. The recipient SGID belongs to a mention node;
the message's recipient is supplied separately to the message operation.

```ts
import { createHeadless, richText } from "circleso/headless";

export async function writeContent(accessToken: string, signedId: string) {
  const member = createHeadless({ accessToken, retries: { retries: 0 } });
  // signedId must come from a completed direct upload's signed_id, not its
  // attachable_sgid, a storage URL, file name or raw file bytes.
  const content = richText.body([
    richText.paragraph(richText.text("The uploaded file is attached.")),
  ], { attachments: [richText.signedAttachment(signedId)] });
  await member.comments.create(123, { comment: { tiptap_body: content } });
  await member.chatRooms.messages.create("room-uuid", { rich_text_body: content });
  return member.chatRooms.messages.update("room-uuid", "message-id", {
    rich_text_body: content,
  });
}
```

The example performs separate writes; there is no transaction or general idempotency
guarantee. [Direct uploads](file-uploads.md) explains how to obtain the signed ID.
Reusing an attachment ID in an example does not establish permission to attach it
to every content type: Circle decides endpoint-specific acceptance and ownership.

## Builders and validation

| Builder | Behavior |
| --- | --- |
| `text(value)` | Nonempty literal string; whitespace, Unicode and newlines are preserved. |
| `link(text, href, target?)` | Text with one link mark. Defaults target to `_blank`; includes both attributes. Convenience hrefs must be absolute HTTP(S), with no user information, whitespace or control characters. |
| `mention(sgid)` | Inline mention with `attrs.sgid`. |
| `hardBreak()` | Inline `hardBreak` node. |
| `paragraph(...inline)` | Wraps text, links, mentions and breaks; empty paragraphs are allowed. |
| `signedAttachment(signedId)` | Explicit branded string for the root attachments array. |
| `body(paragraphs, { attachments? }?)` | Wraps paragraphs in a doc and optionally includes signed IDs. An empty document is allowed locally. |
| `unchecked(envelope)` | Explicit JSON escape hatch for editor extensions; described below. |

Identifiers are opaque nonempty strings without whitespace or control characters.
The SDK cannot establish authenticity, expiry, ownership, the correct identifier kind,
mention existence or server acceptance. `signedAttachment` does not upload a file.
Use the exact `signed_id` returned by a successful upload and an existing member's
mention SGID from an authorized source; the builders do not fetch either identity.

The common builders check node kinds, required attributes and nesting when called.
`paragraph` and `body` snapshot supplied JSON, so subsequent mutation of input nodes
does not change their output. Outputs are ordinary mutable objects; editing them later
can invalidate them. Requests do not automatically run this validator, and pre-existing
generated-schema inputs are still accepted by resource methods.

Snapshots reject cycles, undefined, nonfinite numbers, bigint, functions, class instances,
symbol keys, accessors, hidden fields, sparse arrays and extra array properties. Traversal
is capped at 64 levels and 10,000 JSON values per construction, including primitives.
This is a traversal bound, not a byte or string-length limit. Invalid inputs throw
`CircleConfigError`; unexpected preparation failures retain their original `cause`.
Error causes can contain caller values and should not be logged indiscriminately.

These helpers do not sanitize HTML, render content, enforce Circle's complete editor
schema or provide a UI. Literal `<...>` text remains literal JSON text. The convenience
URL policy is a local constraint; it does not assert Circle disallows other protocols.
No additional blocks or formatting marks are validated in this initial common model.

## Explicit extensions and schema differences

For a separately verified custom block or mark, use `richText.unchecked`. Its return
type is `UncheckedRichTextBody`, distinct from the validated common `RichTextBody`.
It accepts explicitly typed JSON values and checks only JSON, the doc envelope, object
entries in the top-level content array and any root attachment strings. It deliberately
does **not** validate node names, attributes, marks, child nesting or rendering safety.

```ts
import { createAdmin, richText, type RichTextJsonObject } from "circleso/admin";

export async function createHeadingPost(token: string) {
  // Heading level 2 is shown in Circle's TipTap documentation. This SDK's
  // escape hatch preserves the JSON without claiming to validate heading nodes.
  const heading: RichTextJsonObject = {
    type: "heading", attrs: { level: 2 },
    content: [{ type: "text", text: "A heading" }],
  };
  const content = richText.unchecked({ body: { type: "doc", content: [heading] } });
  return createAdmin({ token, retries: { retries: 0 } }).posts.create({
    space_id: 123, name: "Example", tiptap_body: content,
  });
}
```

Checked October 27, 2026: the [rich text guide](https://api.circle.so/get-started/concepts/rich-text-body)
describes paragraphs, text, link marks, mentions, breaks and root signed attachments.
The [TipTap guide](https://api.circle.so/get-started/concepts/tiptap-editor) shows additional
blocks and optional iOS fallback text. Their exact acceptance by every write operation
is not established by those examples.

The committed [Admin spec](https://api-headless.circle.so/api/admin/v2/swagger.yaml) and
[Member spec](https://api-headless.circle.so/api/headless_client/v1/swagger.yaml) have
shallow node definitions in post/comment/lesson bodies, and object-only definitions in
Admin chat imports, contact-note documents, Admin image-post documents and Member message
updates. These generate `Record<string, never>` in places where documented rich text
needs properties. Common paragraph output is structurally assignable to the generated
message, post and comment schemas, but arbitrary extensions and the object-only fields
cannot be represented honestly by those generated types.

`src/richTextCompatibility.ts` provides a type-only extension to the **named facade**
at exactly these 18 current request operations, retaining existing inputs and adding
`RichTextBody | UncheckedRichTextBody` only at the rich-text field:

- Admin: post create/update; image-post create; contact-note create; message create;
  historical message import; course-lesson create/update.
- Member: post create; image-post create/update; comment create/update; reply create/update;
  room create; room-message create/update.

Required fields, recipient alternatives, paths, responses and existing null/omission
semantics remain derived from the specs. This compatibility layer does not invent
response shapes or change runtime serialization. Raw clients and generated declarations
keep the exact spec types, including the object-only restrictions. Use named methods
for the documented compatibility input instead of disguising it as an empty object.

Endpoint rules still apply: Admin post updates may ignore `tiptap_body` when the existing
post has no TipTap body; Member comment/reply updates choose `body` for a trix editor and
`tiptap_body` for a TipTap editor. Attachments do not become inline image/file nodes.
No live Circle rendering or write qualification is claimed by the mocked SDK tests.
