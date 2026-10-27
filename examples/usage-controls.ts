import {
  CircleConfigError,
  CircleHttpError,
  CircleNetworkError,
  type HeadlessApi,
} from "circleso/headless";

type Space = Awaited<ReturnType<HeadlessApi["spaces"]["get"]>>;
type Entry = { value: Space; until: number };

/**
 * Optional application recipe, not an SDK cache. Server Fetch must expose Set-Cookie.
 * Create one closure AND client per verified member/community/permission generation.
 * Retire both on logout, principal/community changes or credential/permission rotation.
 * Only this allowlisted GET is cacheable; no caller-supplied headers, queries or routes.
 */
export function createSessionSpaceCache(member: Pick<HeadlessApi, "raw">) {
  if (typeof process === "undefined" || !process.versions?.node)
    throw new CircleConfigError(
      "This cache recipe requires server Node Fetch with visible Set-Cookie headers.",
    );
  const entries = new Map<number, Entry>();
  let epoch = 0;
  let mutations = 0;
  let retired = false;

  function invalidate(): void {
    epoch += 1;
    entries.clear();
  }

  function check(signal?: AbortSignal): void {
    if (retired) throw new CircleConfigError("This session cache has been retired.");
    if (signal?.aborted) throw new CircleNetworkError("Cache read was aborted.", signal.reason);
  }

  function copy(value: Space): Space {
    try {
      return structuredClone(value);
    } catch (cause) {
      throw new CircleConfigError("Could not copy cached space data.", cause);
    }
  }

  return {
    async get(id: number, signal?: AbortSignal): Promise<Space> {
      check(signal);
      if (!Number.isSafeInteger(id) || id < 1)
        throw new CircleConfigError("A positive integer space ID is required.");
      const current = entries.get(id);
      if (!mutations && current && Date.now() < current.until) return copy(current.value);
      entries.delete(id);
      const startedEpoch = epoch;
      const startedDuringMutation = mutations > 0;
      try {
        const { data, error, response } = await member.raw.GET("/api/headless/v1/spaces/{id}", {
          params: { path: { id } },
          credentials: "omit",
          cache: "no-store",
          ...(signal ? { signal } : {}),
        });
        check(signal);
        if (!response.ok)
          throw new CircleHttpError("Space read failed.", {
            status: response.status,
            url: response.url,
            method: "GET",
            parsedJson: error,
          });
        // Require explicit server freshness. Missing/ambiguous directives are uncacheable.
        const control = response.headers.get("cache-control") ?? "";
        const ages = [...control.matchAll(/(?:^|,)\s*max-age=(\d+)\s*(?=,|$)/gi)];
        const seconds = ages.length === 1 ? Number(ages[0]?.[1]) : 0;
        const ageHeader = response.headers.get("age");
        const age = ageHeader === null ? 0 : /^\d+$/.test(ageHeader) ? Number(ageHeader) : Infinity;
        const ttl = Math.min(5_000, (seconds - age) * 1_000);
        if (
          !startedDuringMutation &&
          !mutations &&
          startedEpoch === epoch &&
          response.status === 200 &&
          ["basic", "default"].includes(response.type) &&
          data !== undefined &&
          !response.headers.has("set-cookie") &&
          !response.headers.has("vary") &&
          !/(?:^|,)\s*(?:no-store|no-cache)(?:\s|=|,|$)/i.test(control) &&
          Number.isFinite(ttl) &&
          ttl > 0 &&
          new TextEncoder().encode(JSON.stringify(data)).byteLength <= 65_536
        ) {
          for (const [key, entry] of entries) if (entry.until <= Date.now()) entries.delete(key);
          if (entries.size >= 32) entries.delete(entries.keys().next().value as number);
          entries.set(id, { value: copy(data), until: Date.now() + ttl });
        }
        return data;
      } catch (cause) {
        invalidate();
        throw cause;
      }
    },
    invalidate,
    /** Wrap every relevant write, including failures with uncertain server outcomes. */
    async change<T>(write: () => Promise<T>): Promise<T> {
      check();
      mutations += 1;
      invalidate();
      try {
        return await write();
      } finally {
        mutations -= 1;
        invalidate();
      }
    },
    /** Permanently disable this cache and prevent in-flight reads from repopulating it. */
    retire(): void {
      retired = true;
      invalidate();
    },
  };
}
