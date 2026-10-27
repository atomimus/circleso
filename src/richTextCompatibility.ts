import type { RichTextBody, UncheckedRichTextBody } from "./core/richText";

// Request-only, named-facade compatibility. Raw clients and generated types stay exact.
// Circle's rich-text docs describe recursive nodes; several request schemas are shallow
// or object-only (Record<string, never>). Keep their existing inputs, modifiers, unions,
// responses and nulls; additionally accept the two explicit SDK body types at these fields.
type BodyValue = RichTextBody | UncheckedRichTextBody;
type ExpandField<T, Field extends string> = T extends object
  ? { [Key in keyof T]: Key extends Field ? T[Key] | BodyValue : T[Key] }
  : T;
type ExpandNested<T, Parent extends string, Field extends string> = T extends object
  ? { [Key in keyof T]: Key extends Parent ? ExpandField<T[Key], Field> : T[Key] }
  : T;
type ExpandBody<T, Field extends string, Parent extends string> = [Parent] extends [never]
  ? ExpandField<T, Field>
  : ExpandNested<T, Parent, Field>;
type ExpandOperation<Op, Field extends string, Parent extends string = never> = {
  [Key in keyof Op]: Key extends "requestBody"
    ? {
        [Part in keyof Op[Key]]: Part extends "content"
          ? {
              [Media in keyof Op[Key][Part]]: ExpandBody<Op[Key][Part][Media], Field, Parent>;
            }
          : Op[Key][Part];
      }
    : Op[Key];
};

// Preserve optional requestBody before mapping its content.
type CompatibleOperation<Op, Field extends string, Parent extends string = never> = {
  [Key in keyof Op]: Key extends "requestBody"
    ? ExpandOperation<{ requestBody: NonNullable<Op[Key]> }, Field, Parent>["requestBody"]
    : Op[Key];
};

export type AdminRichTextOperation<Path, Method, Op> = `${Method & string} ${Path & string}` extends
  | "post /api/admin/v2/posts"
  | "put /api/admin/v2/posts/{id}"
  | "post /api/admin/v2/spaces/{space_id}/images/posts"
  | "post /api/admin/v2/contacts/{contact_id}/contact_notes"
  ? CompatibleOperation<Op, "tiptap_body">
  : `${Method & string} ${Path & string}` extends
        | "post /api/admin/v2/messages"
        | "post /api/admin/v2/chat_room_message_imports"
        | "post /api/admin/v2/course_lessons"
        | "patch /api/admin/v2/course_lessons/{id}"
    ? CompatibleOperation<Op, "rich_text_body">
    : Op;

export type HeadlessRichTextOperation<Path, Method, Op> =
  `${Method & string} ${Path & string}` extends
    | "post /api/headless/v1/spaces/{space_id}/posts"
    | "post /api/headless/v1/spaces/{space_id}/images/posts"
    | "put /api/headless/v1/spaces/{space_id}/images/posts/{id}"
    ? CompatibleOperation<Op, "tiptap_body">
    : `${Method & string} ${Path & string}` extends
          | "post /api/headless/v1/posts/{post_id}/comments"
          | "patch /api/headless/v1/posts/{post_id}/comments/{id}"
          | "post /api/headless/v1/comments/{comment_id}/replies"
          | "patch /api/headless/v1/comments/{comment_id}/replies/{id}"
      ? CompatibleOperation<Op, "tiptap_body", "comment">
      : `${Method & string} ${Path & string}` extends "post /api/headless/v1/messages"
        ? CompatibleOperation<Op, "rich_text_body", "chat_room">
        : `${Method & string} ${Path & string}` extends
              | "post /api/headless/v1/messages/{chat_room_uuid}/chat_room_messages"
              | "put /api/headless/v1/messages/{chat_room_uuid}/chat_room_messages/{id}"
          ? CompatibleOperation<Op, "rich_text_body">
          : Op;
