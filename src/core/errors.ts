export class CircleSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircleSdkError";
  }
}

export type CircleHttpErrorDetails = {
  status: number;
  url: string;
  method: string;
  requestId?: string;
  bodyText?: string;
  parsedJson?: unknown;
};

export class CircleHttpError extends CircleSdkError {
  readonly status: number;
  readonly url: string;
  readonly method: string;
  readonly requestId?: string;
  readonly bodyText?: string;
  readonly parsedJson?: unknown;

  constructor(message: string, details: CircleHttpErrorDetails) {
    super(message);
    this.name = "CircleHttpError";
    this.status = details.status;
    this.url = details.url;
    this.method = details.method;
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

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = "CircleNetworkError";
    this.cause = cause;
  }
}

export class CircleTimeoutError extends CircleSdkError {
  readonly timeoutMs?: number;

  constructor(message: string, timeoutMs?: number) {
    super(message);
    this.name = "CircleTimeoutError";
    if (timeoutMs !== undefined) {
      this.timeoutMs = timeoutMs;
    }
  }
}

export class CircleConfigError extends CircleSdkError {
  constructor(message: string) {
    super(message);
    this.name = "CircleConfigError";
  }
}
