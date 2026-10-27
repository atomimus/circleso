import { parseYaml } from "@redocly/openapi-core";
import { METHODS, object } from "./spec-tools";

/** Make inherited required-only alternatives visible to openapi-typescript 7.10.1. */
export function normalizeRequestTypes(source: string): string {
  const doc: unknown = parseYaml(source);
  if (!object(doc) || !object(doc.paths)) return source;
  let changed = false;
  for (const item of Object.values(doc.paths)) {
    if (!object(item)) continue;
    for (const method of METHODS) {
      const operation = item[method];
      if (!object(operation) || !object(operation.requestBody)) continue;
      const content = operation.requestBody.content;
      if (!object(content)) continue;
      for (const media of Object.values(content)) {
        if (!object(media) || !object(media.schema)) continue;
        const schema = media.schema;
        if (schema.type !== "object" || !object(schema.properties) || !Array.isArray(schema.oneOf))
          continue;
        const properties = schema.properties;
        for (const alternative of schema.oneOf) {
          if (
            !object(alternative) ||
            Object.keys(alternative).some((key) => key !== "required") ||
            !Array.isArray(alternative.required)
          )
            continue;
          if (
            !alternative.required.every(
              (key) => typeof key === "string" && Object.hasOwn(properties, key),
            )
          )
            continue;
          alternative.type = "object";
          alternative.properties = Object.fromEntries(
            alternative.required.map((key: string) => [key, properties[key]]),
          );
          changed = true;
        }
      }
    }
  }
  return changed ? JSON.stringify(doc) : source;
}
