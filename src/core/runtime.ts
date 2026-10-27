import { CircleConfigError } from "./errors";

// Feature checks also cover workers; Node's navigator alone is not a browser signal.
function isBrowserRuntime(): boolean {
  const scope = globalThis as typeof globalThis & {
    WorkerGlobalScope?: { new (...args: never[]): object };
    importScripts?: unknown;
  };
  return (
    typeof window !== "undefined" ||
    typeof document !== "undefined" ||
    (typeof self !== "undefined" &&
      ((typeof scope.WorkerGlobalScope === "function" && self instanceof scope.WorkerGlobalScope) ||
        typeof scope.importScripts === "function" ||
        /^(?:Dedicated|Shared|Service)?WorkerGlobalScope$/.test(self.constructor?.name ?? "")))
  );
}

export function requireServerRuntime(message: string): void {
  if (isBrowserRuntime()) throw new CircleConfigError(message);
}
