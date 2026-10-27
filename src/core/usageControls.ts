import { validateConfigObject } from "./config";
import { CircleConfigError, CircleNetworkError, CircleTimeoutError } from "./errors";

/** Local to one client/transport. Omission disables admission control entirely. */
export type UsageControlsConfig = {
  /** Active attempts, through response EOF/cancel. Default 4; range 1..10000. */
  maxConcurrent?: number;
  /** Waiting attempts, excluding active ones. Default 100; range 0..10000. */
  maxQueueSize?: number;
  /** Queue residence deadline even with timeoutMs disabled. Default 30000; must be > 0. */
  maxQueueWaitMs?: number;
  /** Rolling local start budget. Includes retries, refresh and original-request replay. */
  rate?: { maxRequests: number; intervalMs: number };
  /** Consecutive header/transport failures; body/parse failures are excluded. */
  circuitBreaker?: {
    failureThreshold: number;
    cooldownMs: number;
    /** Default [429, 500..599]. Other HTTP statuses reset the consecutive count. */
    failureStatuses?: readonly number[];
  };
};

/** Credential-free local rejection cause; never contains request or response context. */
export type UsageControlRejection = {
  readonly code: "CIRCLE_QUEUE_FULL" | "CIRCLE_CIRCUIT_OPEN";
};

type Lease = { record: (status: number) => void; release: () => void };
type Waiter = {
  resolve: (lease: Lease) => void;
  reject: (error: unknown) => void;
  cleanup: () => void;
};

/** Internal controller; stores counters/timestamps only, never credentials, URLs or payloads. */
export function createUsageController(input?: UsageControlsConfig) {
  if (input === undefined) return undefined;
  validateConfigObject(input, "usage");
  const maxConcurrent = integer(
    input.maxConcurrent !== undefined ? input.maxConcurrent : 4,
    "maxConcurrent",
    1,
    10_000,
  );
  const maxQueueSize = integer(
    input.maxQueueSize !== undefined ? input.maxQueueSize : 100,
    "maxQueueSize",
    0,
    10_000,
  );
  const maxQueueWaitMs = integer(
    input.maxQueueWaitMs !== undefined ? input.maxQueueWaitMs : 30_000,
    "maxQueueWaitMs",
    1,
  );
  let rate: { maxRequests: number; intervalMs: number } | undefined;
  if (input.rate !== undefined) {
    validateConfigObject(input.rate, "usage.rate");
    rate = {
      maxRequests: integer(input.rate.maxRequests, "rate.maxRequests", 1, 10_000),
      intervalMs: integer(input.rate.intervalMs, "rate.intervalMs", 1),
    };
  }
  let circuit: { failureThreshold: number; cooldownMs: number; statuses: Set<number> } | undefined;
  if (input.circuitBreaker !== undefined) {
    validateConfigObject(input.circuitBreaker, "usage.circuitBreaker");
    const statuses =
      input.circuitBreaker.failureStatuses !== undefined
        ? input.circuitBreaker.failureStatuses
        : [429, ...Array.from({ length: 100 }, (_, i) => 500 + i)];
    if (
      !Array.isArray(statuses) ||
      statuses.length > 200 ||
      statuses.some((status) => !Number.isInteger(status) || status < 400 || status > 599)
    )
      throw new CircleConfigError(
        "usage.circuitBreaker.failureStatuses must contain at most 200 HTTP statuses from 400 through 599.",
      );
    circuit = {
      failureThreshold: integer(
        input.circuitBreaker.failureThreshold,
        "circuitBreaker.failureThreshold",
        1,
        10_000,
      ),
      cooldownMs: integer(input.circuitBreaker.cooldownMs, "circuitBreaker.cooldownMs", 1),
      statuses: new Set(statuses),
    };
  }

  const queue = new Set<Waiter>();
  const starts: number[] = [];
  let active = 0;
  let failures = 0;
  let generation = 0;
  let openedAt: number | undefined;
  let probe = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let lastNow = Date.now();
  const now = () => {
    lastNow = Math.max(lastNow, Date.now());
    return lastNow;
  };
  const rejection = (code: UsageControlRejection["code"]) =>
    new CircleNetworkError("Request blocked by local usage controls.", Object.freeze({ code }));

  function unavailable(): boolean {
    return openedAt !== undefined && (probe || now() - openedAt < (circuit?.cooldownMs ?? 0));
  }

  function rateDelay(): number {
    if (!rate) return 0;
    const time = now();
    while (starts.length && time - (starts[0] ?? time) >= rate.intervalMs) starts.shift();
    return starts.length >= rate.maxRequests
      ? Math.max(1, (starts[0] ?? time) + rate.intervalMs - time)
      : 0;
  }

  function open() {
    openedAt = now();
    probe = false;
    generation += 1;
  }

  function pump() {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    while (queue.size) {
      if (unavailable()) {
        for (const waiter of queue) {
          queue.delete(waiter);
          waiter.cleanup();
          waiter.reject(rejection("CIRCLE_CIRCUIT_OPEN"));
        }
        return;
      }
      if (active >= maxConcurrent) return;
      const delay = rateDelay();
      if (delay > 0) {
        timer = setTimeout(pump, delay);
        return;
      }
      const waiter = queue.values().next().value as Waiter;
      queue.delete(waiter);
      waiter.cleanup();
      active += 1;
      if (rate) starts.push(now());
      const leaseGeneration = generation;
      const isProbe = openedAt !== undefined;
      if (isProbe) probe = true;
      let recorded = false;
      let released = false;
      waiter.resolve({
        record(status) {
          if (recorded || released) return;
          recorded = true;
          if (!circuit || generation !== leaseGeneration) return;
          const failed = status === 0 || circuit.statuses.has(status);
          if (isProbe) {
            if (failed) open();
            else {
              openedAt = undefined;
              probe = false;
              failures = 0;
              generation += 1;
            }
          } else if (failed) {
            failures += 1;
            if (failures >= circuit.failureThreshold) open();
          } else failures = 0;
          pump();
        },
        release() {
          if (released) return;
          released = true;
          active -= 1;
          // A canceled/preparation-failed probe gives no health evidence; reopen conservatively.
          if (isProbe && !recorded && generation === leaseGeneration) open();
          pump();
        },
      });
    }
  }

  return {
    acquire(signal: AbortSignal): Promise<Lease> {
      if (signal.aborted) return Promise.reject(signal.reason);
      if (unavailable()) return Promise.reject(rejection("CIRCLE_CIRCUIT_OPEN"));
      const immediate = queue.size === 0 && active < maxConcurrent && rateDelay() === 0;
      if (!immediate && queue.size >= maxQueueSize)
        return Promise.reject(rejection("CIRCLE_QUEUE_FULL"));
      return new Promise<Lease>((resolve, reject) => {
        const remove = (error: unknown) => {
          if (!queue.delete(waiter)) return;
          waiter.cleanup();
          reject(error);
          pump();
        };
        const onAbort = () => remove(signal.reason);
        const queueTimer = setTimeout(
          () =>
            remove(
              new CircleTimeoutError(
                "Local usage queue deadline expired.",
                maxQueueWaitMs,
                new DOMException("The queue deadline expired.", "TimeoutError"),
              ),
            ),
          maxQueueWaitMs,
        );
        const waiter: Waiter = {
          resolve,
          reject,
          cleanup() {
            clearTimeout(queueTimer);
            signal.removeEventListener("abort", onAbort);
          },
        };
        signal.addEventListener("abort", onAbort, { once: true });
        queue.add(waiter);
        if (signal.aborted) onAbort();
        else pump();
      });
    },
  };
}

function integer(value: number, name: string, min: number, max = 2_147_483_647): number {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    throw new CircleConfigError(`usage.${name} must be an integer from ${min} through ${max}.`);
  return value;
}
