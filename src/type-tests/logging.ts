import {
  createHeadless,
  createLoggerMiddleware,
  type LoggerErrorContext,
  type LoggerHooks,
} from "../index";

// Compile-only public logger contracts. Never execute fixtures.
export function loggingContracts(): void {
  const logger: LoggerHooks = {
    logBodies: true,
    maxBodyBytes: 1024,
    bodyReadTimeoutMs: 100,
    redactHeaders: ["content-length"],
    onRequest: async (context) => {
      const method: string = context.request.method;
      const body: string | undefined = context.requestBody;
      void method;
      void body;
      // @ts-expect-error raw options may contain credentials or executable serializers
      void context.options;
      // @ts-expect-error raw parameter objects are not logging snapshots
      void context.params;
    },
    onError: (context: LoggerErrorContext) => {
      const status: number | undefined = context.error.status;
      void status;
      // @ts-expect-error original causes may contain credentials
      void context.error.cause;
    },
  };
  createHeadless({ token: "synthetic", logger });
  createLoggerMiddleware(logger);
  // Preserve void-callback compatibility: sink return values are ignored.
  createLoggerMiddleware({ onResponse: () => 1 });
  // @ts-expect-error callbacks receive snapshots, not arbitrary strings
  createLoggerMiddleware({ onResponse: (_context: string) => {} });
  // @ts-expect-error byte bounds are numeric
  createLoggerMiddleware({ maxBodyBytes: "1024" });
}
