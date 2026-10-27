import { describe, expect, it } from "vitest";
import { richText as adminRichText, createAdmin } from "./admin";
import { CircleConfigError } from "./core/errors";
import { createHeadless, richText as memberRichText } from "./headless";
import { type RichTextJsonObject, richText } from "./index";

const makeBody = () =>
  richText.body(
    [
      richText.paragraph(
        richText.text("Hello "),
        richText.mention("synthetic-sgid"),
        richText.hardBreak(),
        richText.link("Guide", "https://example.com/guide?q=1#part"),
      ),
      richText.paragraph(),
    ],
    { attachments: [richText.signedAttachment("synthetic-signed-id")] },
  );

describe("common rich text builders", () => {
  it("produces the documented envelope and nested nodes through all content exports", () => {
    expect(adminRichText).toBe(richText);
    expect(memberRichText).toBe(richText);
    expect(makeBody()).toEqual({
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "Hello " },
              { type: "mention", attrs: { sgid: "synthetic-sgid" } },
              { type: "hardBreak" },
              {
                type: "text",
                text: "Guide",
                marks: [
                  {
                    type: "link",
                    attrs: { href: "https://example.com/guide?q=1#part", target: "_blank" },
                  },
                ],
              },
            ],
          },
          { type: "paragraph", content: [] },
        ],
      },
      attachments: ["synthetic-signed-id"],
    });
    expect(richText.link("Guide", "http://example.com", "_self").marks?.[0]?.attrs.target).toBe(
      "_self",
    );
    expect(richText.body([])).toEqual({ body: { type: "doc", content: [] } });
  });

  it("snapshots supplied nodes, marks, arrays and attachments without freezing outputs", () => {
    const node = richText.link("Before", "https://example.com");
    const paragraph = richText.paragraph(node);
    node.text = "After";
    node.marks?.splice(0);
    expect(paragraph.content[0]).toEqual(richText.link("Before", "https://example.com"));
    const attachments = [richText.signedAttachment("synthetic-id")];
    const body = richText.body([paragraph], { attachments });
    paragraph.content.length = 0;
    attachments.length = 0;
    expect(body.body.content[0]?.content).toHaveLength(1);
    expect(body.attachments).toEqual(["synthetic-id"]);
    body.body.content.push(richText.paragraph());
    expect(body.body.content).toHaveLength(2);
  });

  it("leaves text literal and opaque IDs intact without claiming sanitization or verification", () => {
    expect(richText.text("<script>literal</script>\n🙂").text).toBe("<script>literal</script>\n🙂");
    expect(richText.mention("not-cryptographically-verified").attrs.sgid).toBe(
      "not-cryptographically-verified",
    );
    expect(richText.signedAttachment("synthetic-id")).toBe("synthetic-id");
  });

  it.each([
    "",
    " ",
    "a b",
    "a\nb",
    "a\u0000b",
    "a\u007fb",
    undefined,
    null,
    42,
    {},
  ])("rejects malformed identifiers %j", (value) => {
    expect(() => richText.mention(value as never)).toThrow(CircleConfigError);
    expect(() => richText.signedAttachment(value as never)).toThrow(CircleConfigError);
  });

  it.each(["", undefined, null, 42])("rejects malformed text %j", (value) => {
    expect(() => richText.text(value as never)).toThrow(CircleConfigError);
    expect(() => richText.link(value as never, "https://example.com")).toThrow(CircleConfigError);
  });

  it.each([
    "",
    "/relative",
    "javascript:alert(1)",
    "data:text/html,x",
    "mailto:a@example.com",
    "https://user:password@example.com",
    "https://example.com/a b",
    "https://example.com/\npath",
    "https://",
  ])("rejects unsupported convenience URL %j", (href) => {
    expect(() => richText.link("Link", href)).toThrow(CircleConfigError);
  });

  it("preserves URL parser causes without copying the URL into the SDK error message", () => {
    try {
      richText.link("Link", "/relative");
    } catch (error) {
      expect(error).toBeInstanceOf(CircleConfigError);
      expect((error as CircleConfigError).cause).toBeInstanceOf(TypeError);
      expect((error as CircleConfigError).message).not.toContain("/relative");
    }
    expect(() => richText.link("Link", "https://example.com", "bad target")).toThrow(
      CircleConfigError,
    );
  });

  it.each([
    { type: "text", text: "" },
    { type: "mention", attrs: {} },
    { type: "mention", attrs: { sgid: "a b" } },
    { type: "paragraph", content: [] },
    { type: "hardBreak", text: "extra" },
    {
      type: "text",
      text: "Link",
      marks: [{ type: "link", attrs: { href: "https://example.com" } }],
    },
    { type: "text", text: "Bold", marks: [{ type: "bold" }] },
    { type: "text", text: "Link", marks: null },
    { type: "custom" },
    null,
  ])("revalidates malformed inline input %j", (node) => {
    expect(() => richText.paragraph(node as never)).toThrow(CircleConfigError);
  });

  it("rejects malformed blocks, arrays, marks and attachment arrays", () => {
    for (const paragraphs of [
      undefined,
      {},
      [richText.text("inline")],
      [{ type: "paragraph", content: null }],
    ]) {
      expect(() => richText.body(paragraphs as never)).toThrow(CircleConfigError);
    }
    expect(() => richText.body([], { attachments: ["bad id"] as never })).toThrow(
      CircleConfigError,
    );
    expect(() => richText.body([], { attachments: "bad" as never })).toThrow(CircleConfigError);
    const linked = richText.link("Link", "https://example.com");
    linked.marks?.push(...linked.marks);
    expect(() => richText.paragraph(linked)).toThrow(CircleConfigError);
  });
});

describe("explicit rich text extensions", () => {
  it("preserves nested extension blocks/attrs/marks, future fields and nulls as JSON", () => {
    const input = {
      body: {
        type: "doc" as const,
        content: [
          {
            type: "heading",
            attrs: { level: 2 },
            content: [{ type: "text", text: "Title", marks: [{ type: "bold" }] }],
          },
        ],
      },
      future: { value: null },
    };
    const result = richText.unchecked(input);
    expect(result).toEqual(input);
    input.body.content[0]?.content.splice(0);
    expect(result.body.content[0]?.content).toHaveLength(1);
    // Unknown node names are deliberate: no claim of Circle/editor acceptance.
    expect(
      richText.unchecked({ body: { type: "doc", content: [{ type: "futureNode" }] } }).body
        .content[0]?.type,
    ).toBe("futureNode");
  });

  it.each([
    {},
    { body: {} },
    { body: { type: "paragraph", content: [] } },
    { body: { type: "doc", content: [null] } },
    { body: { type: "doc", content: [] }, attachments: ["bad id"] },
    { body: { type: "doc", content: [] }, extra: undefined },
    { body: { type: "doc", content: [] }, extra: Number.NaN },
    { body: { type: "doc", content: [] }, extra: Number.POSITIVE_INFINITY },
    { body: { type: "doc", content: [] }, extra: 1n },
    { body: { type: "doc", content: [] }, extra: new Date() },
    { body: { type: "doc", content: [] }, extra: () => "value" },
    { body: { type: "doc", content: [] }, extra: new Array(1) },
  ])("rejects malformed JSON/envelope case %#", (input) => {
    expect(() => richText.unchecked(input as never)).toThrow(CircleConfigError);
  });

  it("rejects cycles and bounded-depth/value overflow, but allows shared JSON subtrees", () => {
    const cyclic: RichTextJsonObject = {};
    cyclic.self = cyclic;
    expect(() => richText.unchecked({ body: { type: "doc", content: [cyclic] } })).toThrow(
      CircleConfigError,
    );
    let nested: RichTextJsonObject = {};
    for (let index = 0; index < 65; index++) nested = { nested };
    expect(() => richText.unchecked({ body: { type: "doc", content: [nested] } })).toThrow(
      CircleConfigError,
    );
    expect(() =>
      richText.unchecked({
        body: { type: "doc", content: [] },
        extra: Array.from({ length: 10001 }, () => 0),
      }),
    ).toThrow(CircleConfigError);
    const shared = { type: "future" };
    expect(
      richText.unchecked({ body: { type: "doc", content: [shared, shared] } }).body.content,
    ).toEqual([shared, shared]);
  });

  it("rejects accessors without invoking them and preserves proxy failure causes", () => {
    let invoked = false;
    const input = {
      body: { type: "doc", content: [] },
      get extra() {
        invoked = true;
        return "value";
      },
    };
    expect(() => richText.unchecked(input as never)).toThrow(CircleConfigError);
    expect(invoked).toBe(false);
    const cause = new Error("synthetic proxy failure");
    try {
      richText.unchecked(
        new Proxy(
          {},
          {
            ownKeys() {
              throw cause;
            },
          },
        ) as never,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(CircleConfigError);
      expect((error as CircleConfigError).cause).toBe(cause);
    }
    const json = JSON.parse('{"body":{"type":"doc","content":[]},"__proto__":{"polluted":true}}');
    const output = richText.unchecked(json);
    expect(Object.hasOwn(output, "__proto__")).toBe(true);
    expect(Object.getPrototypeOf(output)).toBe(Object.prototype);
  });
});

describe("public rich text request boundary", () => {
  it.each([
    false,
    true,
  ])("serializes all 18 exact request locations (extension=%s)", async (isExtension) => {
    const content = isExtension
      ? richText.unchecked({
          body: { type: "doc", content: [{ type: "futureNode", attrs: { example: true } }] },
        })
      : makeBody();
    const seen: { method: string; url: string; body: unknown }[] = [];
    const fetcher: typeof fetch = async (input) => {
      const request = input as Request;
      seen.push({
        method: request.method,
        url: new URL(request.url).pathname,
        body: await request.json(),
      });
      return Response.json({});
    };
    const admin = createAdmin({ token: "synthetic", fetcher, retries: { retries: 0 } });
    const member = createHeadless({ accessToken: "synthetic", fetcher, retries: { retries: 0 } });
    await admin.posts.create({ space_id: 1, name: "Example", tiptap_body: content });
    await admin.posts.update("1", { tiptap_body: content });
    await admin.posts.images.create(1, { gallery_attributes: {}, tiptap_body: content });
    await admin.contactNotes.create("1", { tiptap_body: content });
    await admin.messages.create({ chat_room_uuid: "room", rich_text_body: content });
    await admin.chatRoomMessageImports.create({
      chat_room_uuid: "room",
      user_email: "synthetic@example.com",
      sent_at: "2020-01-01T00:00:00Z",
      rich_text_body: content,
    });
    await admin.courses.lessons.create({ section_id: 1, name: "Example", rich_text_body: content });
    await admin.courses.lessons.update(1, { rich_text_body: content });
    await member.posts.create(1, { name: "Example", tiptap_body: content });
    await member.posts.images.create(1, { tiptap_body: content });
    await member.posts.images.update(1, 2, { tiptap_body: content });
    await member.comments.create(1, { comment: { tiptap_body: content } });
    await member.comments.update(1, 2, { comment: { tiptap_body: content } });
    await member.comments.replies.create("2", { comment: { tiptap_body: content } });
    await member.comments.replies.update(2, 3, { comment: { tiptap_body: content } });
    await member.chatRooms.create({
      chat_room: { kind: "direct", community_member_ids: ["1"], rich_text_body: content },
    });
    await member.chatRooms.messages.create("room", { rich_text_body: content });
    await member.chatRooms.messages.update("room", "2", { rich_text_body: content });
    expect(seen).toHaveLength(18);
    for (const [index, item] of seen.entries()) {
      expect(item.url).toMatch(/^\/api\/(admin\/v2|headless\/v1)\//);
      expect(["POST", "PUT", "PATCH"]).toContain(item.method);
      const body = item.body as Record<string, Record<string, unknown> | unknown>;
      const nested =
        index >= 11 && index <= 14 ? body.comment : index === 15 ? body.chat_room : body;
      const field = index < 4 || (index >= 8 && index <= 14) ? "tiptap_body" : "rich_text_body";
      expect((nested as Record<string, unknown>)[field]).toEqual(content);
    }
  });
});
