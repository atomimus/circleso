import { parseYaml } from "@redocly/openapi-core";

export const CHAT_IMPORT_PATH = "/api/admin/v2/chat_room_message_imports";
export const MISSING_CHAT_SCHEMA = "admin_v2_chat_room_message";

/** Only the known Admin chat-import 201 response may be unknown. Never rewrite other refs. */
export function applySpecOverrides(source: string): string {
  const doc = parseYaml(source) as {
    components?: { schemas?: Record<string, unknown> };
    paths?: Record<
      string,
      {
        post?: {
          responses?: Record<
            string,
            {
              content?: Record<string, { schema?: Record<string, unknown> }>;
            }
          >;
        };
      }
    >;
  } | null;
  if (doc?.components?.schemas && Object.hasOwn(doc.components.schemas, MISSING_CHAT_SCHEMA))
    return source;
  const schema =
    doc?.paths?.[CHAT_IMPORT_PATH]?.post?.responses?.["201"]?.content?.["application/json"]?.schema;
  if (schema?.$ref !== `#/components/schemas/${MISSING_CHAT_SCHEMA}`) return source;
  delete schema.$ref;
  schema.description = "Response schema is missing from the upstream Circle spec.";
  return JSON.stringify(doc);
}
