/**
 * Keep downloaded specs intact and apply only known upstream fixes for generation.
 */
export function applySpecOverrides(source: string): string {
  // Circle references this response in Admin V2 chat imports without defining it.
  // Leave the response unknown until Circle publishes the schema.
  if (/^ {4}["']?admin_v2_chat_room_message["']?:/m.test(source)) {
    return source;
  }

  return source.replace(
    /^(\s*)["']?\$ref["']?: ["']#\/components\/schemas\/admin_v2_chat_room_message["'][ \t]*$/gm,
    "$1description: Response schema is missing from the upstream Circle spec.",
  );
}
