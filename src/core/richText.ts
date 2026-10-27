import { CircleConfigError } from "./errors";

/** JSON data only: no undefined, functions, bigint, Date or editor instances. */
export type RichTextJsonValue =
  | null
  | boolean
  | number
  | string
  | RichTextJsonValue[]
  | { [key: string]: RichTextJsonValue };
export type RichTextJsonObject = { [key: string]: RichTextJsonValue };

export type RichTextLinkMark = {
  type: "link";
  attrs: { href: string; target: string };
};
export type RichTextText = { type: "text"; text: string; marks?: RichTextLinkMark[] };
export type RichTextMention = { type: "mention"; attrs: { sgid: string } };
export type RichTextHardBreak = { type: "hardBreak" };
export type RichTextInline = RichTextText | RichTextMention | RichTextHardBreak;
export type RichTextParagraph = { type: "paragraph"; content: RichTextInline[] };
export type RichTextDocument = { type: "doc"; content: RichTextParagraph[] };
export type RichTextBody = { body: RichTextDocument; attachments?: string[] };

declare const signedAttachment: unique symbol;
/** Locally checked opaque signed_id; authenticity, expiry and ownership are not verified. */
export type SignedAttachmentId = string & { readonly [signedAttachment]: true };
declare const uncheckedBody: unique symbol;
/** Explicit escape hatch: JSON/envelope checked, editor nodes/attributes are NOT validated. */
export type UncheckedRichTextBody = {
  body: { type: "doc"; content: RichTextJsonObject[] } & RichTextJsonObject;
  attachments?: string[];
} & RichTextJsonObject & { readonly [uncheckedBody]: true };

function prepare<T>(action: () => T): T {
  try {
    return action();
  } catch (cause) {
    if (cause instanceof CircleConfigError) throw cause;
    throw new CircleConfigError("Cannot prepare rich text", cause);
  }
}

function requireValue(condition: unknown, message: string): asserts condition {
  if (!condition) throw new CircleConfigError(message);
}

function token(value: unknown, label: string): asserts value is string {
  requireValue(
    typeof value === "string" && value.length > 0 && !/[\s\p{Cc}]/u.test(value),
    `${label} must be a nonempty opaque string without whitespace or control characters`,
  );
}

function textValue(value: unknown): asserts value is string {
  requireValue(typeof value === "string" && value.length > 0, "Text must be a nonempty string");
}

function linkAttributes(href: unknown, target: unknown): asserts href is string {
  token(href, "Link href");
  token(target, "Link target");
  // An intentionally small convenience policy, not an HTML sanitizer.
  const url = new URL(href);
  requireValue(
    ["http:", "https:"].includes(url.protocol) && !url.username && !url.password,
    "Link href must be an absolute HTTP(S) URL without user information",
  );
}

/** Snapshot JSON without invoking getters/toJSON; bound traversal and reject cycles. */
function snapshot(value: unknown): RichTextJsonValue {
  let remaining = 10_000;
  const ancestors = new Set<object>();
  function visit(input: unknown, depth: number): RichTextJsonValue {
    requireValue(
      depth <= 64 && remaining-- > 0,
      "Rich text exceeds 64 levels or 10000 JSON values",
    );
    if (input === null || typeof input === "string" || typeof input === "boolean") return input;
    if (typeof input === "number") {
      requireValue(Number.isFinite(input), "Rich text JSON numbers must be finite");
      return input;
    }
    requireValue(typeof input === "object", "Rich text must contain only JSON values");
    requireValue(!ancestors.has(input), "Rich text must not contain cycles");
    const array = Array.isArray(input);
    const prototype: unknown = Object.getPrototypeOf(input);
    requireValue(
      array || prototype === Object.prototype || prototype === null,
      "Rich text must contain only plain JSON objects and arrays",
    );
    requireValue(
      Object.getOwnPropertySymbols(input).length === 0,
      "Rich text cannot contain symbols",
    );
    ancestors.add(input);
    const descriptors = Object.getOwnPropertyDescriptors(input);
    const entries: [string, RichTextJsonValue][] = [];
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (array && key === "length") continue;
      requireValue(
        descriptor.enumerable && "value" in descriptor,
        "Rich text cannot contain accessors or hidden fields",
      );
      entries.push([key, visit(descriptor.value, depth + 1)]);
    }
    ancestors.delete(input);
    if (array) {
      requireValue(
        entries.length === input.length && entries.every(([key], index) => key === String(index)),
        "Rich text arrays must be dense and have no extra properties",
      );
      return entries.map(([, item]) => item);
    }
    return Object.fromEntries(entries);
  }
  return visit(value, 0);
}

function object(value: RichTextJsonValue | undefined): asserts value is RichTextJsonObject {
  requireValue(
    value !== null && typeof value === "object" && !Array.isArray(value),
    "Expected a rich text object",
  );
}

function keys(value: RichTextJsonObject, allowed: string[]): void {
  requireValue(
    Object.keys(value).every((key) => allowed.includes(key)),
    "Unsupported common rich text field; use richText.unchecked for extensions",
  );
}

function inline(value: RichTextJsonValue): void {
  object(value);
  switch (value.type) {
    case "text": {
      keys(value, ["type", "text", "marks"]);
      textValue(value.text);
      if (value.marks !== undefined) {
        requireValue(Array.isArray(value.marks), "Text marks must be an array");
        requireValue(value.marks.length <= 1, "Common text supports at most one link mark");
        for (const mark of value.marks) {
          object(mark);
          keys(mark, ["type", "attrs"]);
          requireValue(mark.type === "link", "Unsupported common text mark");
          object(mark.attrs);
          keys(mark.attrs, ["href", "target"]);
          linkAttributes(mark.attrs.href, mark.attrs.target);
        }
      }
      break;
    }
    case "mention":
      keys(value, ["type", "attrs"]);
      object(value.attrs);
      keys(value.attrs, ["sgid"]);
      token(value.attrs.sgid, "Mention SGID");
      break;
    case "hardBreak":
      keys(value, ["type"]);
      break;
    default:
      throw new CircleConfigError("Unsupported inline node; use richText.unchecked for extensions");
  }
}

function paragraphValue(value: RichTextJsonValue): void {
  object(value);
  keys(value, ["type", "content"]);
  requireValue(
    value.type === "paragraph" && Array.isArray(value.content),
    "Expected a paragraph with an inline content array",
  );
  for (const item of value.content) inline(item);
}

function envelope(value: RichTextJsonValue): asserts value is RichTextJsonObject {
  object(value);
  object(value.body);
  requireValue(
    value.body.type === "doc" && Array.isArray(value.body.content),
    "Rich text body must contain a doc with a content array",
  );
  for (const node of value.body.content) object(node);
  if (value.attachments !== undefined) {
    requireValue(Array.isArray(value.attachments), "Attachments must be an array of signed IDs");
    for (const id of value.attachments) token(id, "Attachment signed_id");
  }
}

/** Common Circle nodes only. Outputs are fresh, mutable JSON, checked when constructed. */
export const richText = {
  text(value: string): RichTextText {
    return prepare(() => {
      textValue(value);
      return { type: "text", text: value };
    });
  },
  /** Defaults target to _blank; convenience links permit absolute HTTP(S) URLs only. */
  link(value: string, href: string, target = "_blank"): RichTextText {
    return prepare(() => {
      textValue(value);
      linkAttributes(href, target);
      return { type: "text", text: value, marks: [{ type: "link", attrs: { href, target } }] };
    });
  },
  mention(sgid: string): RichTextMention {
    return prepare(() => {
      token(sgid, "Mention SGID");
      return { type: "mention", attrs: { sgid } };
    });
  },
  hardBreak(): RichTextHardBreak {
    return { type: "hardBreak" };
  },
  paragraph(...content: RichTextInline[]): RichTextParagraph {
    return prepare(() => {
      const value = snapshot({ type: "paragraph", content });
      paragraphValue(value);
      return value as RichTextParagraph;
    });
  },
  signedAttachment(signedId: string): SignedAttachmentId {
    return prepare(() => {
      token(signedId, "Attachment signed_id");
      return signedId as SignedAttachmentId;
    });
  },
  body(
    paragraphs: readonly RichTextParagraph[],
    options: { attachments?: readonly SignedAttachmentId[] } = {},
  ): RichTextBody {
    return prepare(() => {
      const settings = snapshot(options);
      object(settings);
      keys(settings, ["attachments"]);
      const value = snapshot({
        body: { type: "doc", content: paragraphs },
        ...(settings.attachments === undefined ? {} : { attachments: settings.attachments }),
      });
      envelope(value);
      object(value.body);
      requireValue(Array.isArray(value.body.content), "Expected paragraph content");
      for (const paragraph of value.body.content) paragraphValue(paragraph);
      return value as RichTextBody;
    });
  },
  /** Explicitly unvalidated editor extensions; checks only JSON, envelope and opaque IDs. */
  unchecked(
    value: {
      body: { type: "doc"; content: RichTextJsonObject[] } & RichTextJsonObject;
      attachments?: string[];
    } & RichTextJsonObject,
  ): UncheckedRichTextBody {
    return prepare(() => {
      const result = snapshot(value);
      envelope(result);
      return result as UncheckedRichTextBody;
    });
  },
};
