export type HttpErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "UPSTREAM_FAILURE"
  | "INTERNAL";

export class AppHttpError extends Error {
  constructor(
    public readonly code: HttpErrorCode,
    public readonly status: 400 | 401 | 403 | 502 | 500,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message);
    this.name = "AppHttpError";
    if (options && "cause" in options) {
      this.cause = options.cause;
    }
  }
}

export function toAppHttpError(error: unknown) {
  if (error instanceof AppHttpError) {
    return error;
  }

  return new AppHttpError("INTERNAL", 500, "Unexpected internal error", {
    cause: error,
  });
}
