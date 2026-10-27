export class CircleSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircleSdkError";
  }
}

export type CircleResponseContext = {
  status?: number;
  url?: string;
  method?: string;
  requestId?: string;
  bodyText?: string;
  parsedJson?: unknown;
};

export type CircleHttpErrorDetails = CircleResponseContext & {
  status: number;
  url: string;
  method: string;
  cause?: unknown;
};

export class CircleHttpError extends CircleSdkError {
  readonly status: number;
  readonly url: string;
  readonly method: string;
  readonly requestId?: string;
  readonly bodyText?: string;
  readonly parsedJson?: unknown;
  readonly cause: unknown;

  constructor(message: string, details: CircleHttpErrorDetails) {
    super(message);
    this.name = "CircleHttpError";
    this.status = details.status;
    this.url = details.url;
    this.method = details.method;
    this.cause = details.cause;
    if (details.requestId !== undefined) {
      this.requestId = details.requestId;
    }
    if (details.bodyText !== undefined) {
      this.bodyText = details.bodyText;
    }
    if (details.parsedJson !== undefined) {
      this.parsedJson = details.parsedJson;
    }
  }
}

export class CircleNetworkError extends CircleSdkError {
  readonly cause: unknown;
  declare readonly status?: number;
  declare readonly url?: string;
  declare readonly method?: string;
  declare readonly requestId?: string;
  declare readonly bodyText?: string;
  declare readonly parsedJson?: unknown;

  constructor(message: string, cause: unknown, context?: CircleResponseContext) {
    super(message);
    this.name = "CircleNetworkError";
    this.cause = cause;
    Object.assign(this, context);
  }
}

export class CircleTimeoutError extends CircleSdkError {
  readonly timeoutMs?: number;
  readonly cause: unknown;
  declare readonly status?: number;
  declare readonly url?: string;
  declare readonly method?: string;
  declare readonly requestId?: string;
  declare readonly bodyText?: string;
  declare readonly parsedJson?: unknown;

  constructor(message: string, timeoutMs?: number, cause?: unknown) {
    super(message);
    this.name = "CircleTimeoutError";
    this.cause = cause;
    if (timeoutMs !== undefined) {
      this.timeoutMs = timeoutMs;
    }
  }
}

export class CircleConfigError extends CircleSdkError {
  readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CircleConfigError";
    this.cause = cause;
  }
}
