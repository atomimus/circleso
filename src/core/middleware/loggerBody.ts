import { HEADER_CONTENT_LENGTH, HEADER_CONTENT_TYPE } from "../headers";
import { logJson, REDACTED_VALUE } from "./loggerRedaction";

/** Best effort only. Never emit a truncated prefix or wait for a tee's cancellation promise. */
export async function inspectLogBody(
  source: Request | Response,
  maxBytes: number,
  timeoutMs: number,
): Promise<string | undefined> {
  if (maxBytes === 0 || source.bodyUsed || source.body?.locked) return undefined;
  if (!source.body) return "";
  const mime = source.headers.get(HEADER_CONTENT_TYPE)?.split(";", 1)[0]?.trim() ?? "";
  const json = /^(application\/json|[^/]+\/[^/]+\+json)$/i.test(mime);
  const form = /^application\/x-www-form-urlencoded$/i.test(mime);
  if (!json && !form) return undefined;
  const length = source.headers.get(HEADER_CONTENT_LENGTH);
  if (length && /^\d+$/.test(length) && Number(length) > maxBytes) return undefined;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    reader = source.clone().body?.getReader();
    if (!reader) return "";
    const active = reader;
    const read = async () => {
      const chunks: Uint8Array[] = [];
      let size = 0;
      // A source can emit endless empty chunks without yielding to a deadline timer.
      for (let reads = 0; ; reads += 1) {
        if (reads === 1024) return undefined;
        const { done, value } = await active.read();
        if (done) break;
        if (!(value instanceof Uint8Array) || value.byteLength > maxBytes - size) return undefined;
        size += value.byteLength;
        chunks.push(value);
      }
      const bytes = new Uint8Array(size);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (!text) return "";
      if (json) return JSON.stringify(logJson(JSON.parse(text)));
      if (text.split("&").some((field) => !field.includes("="))) return undefined;
      const fields = new URLSearchParams(text);
      if ([...fields.keys()].some((name) => !/^[a-z_][a-z0-9_.[\]-]{0,127}$/i.test(name)))
        return undefined;
      for (const name of new Set(fields.keys())) fields.set(name, REDACTED_VALUE);
      return fields.toString();
    };
    return await Promise.race([
      read(),
      new Promise<undefined>((resolve) => {
        timer = setTimeout(() => resolve(undefined), timeoutMs);
      }),
    ]);
  } catch {
    return undefined;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    if (reader) {
      void reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  }
}
