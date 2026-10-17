export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      "NOT_FOUND",
      id ? `${resource} with id ${id} not found` : `${resource} not found`,
      404,
    );
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: unknown) {
    super("BAD_REQUEST", message, 400, details);
    this.name = "BadRequestError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super("VALIDATION_ERROR", message, 400, details);
    this.name = "ValidationError";
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: unknown) {
    super("UNAUTHORIZED", message, 401, details);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: unknown) {
    super("FORBIDDEN", message, 403, details);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: unknown) {
    super("CONFLICT", message, 409, details);
    this.name = "ConflictError";
  }
}

export class InvalidStateTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(
      "INVALID_STATE_TRANSITION",
      `Cannot transition from ${from} to ${to}`,
      409,
    );
    this.name = "InvalidStateTransitionError";
  }
}

export class RetryableError extends AppError {
  constructor(message: string, details?: unknown) {
    super("RETRYABLE", message, 503, details);
    this.name = "RetryableError";
  }
}

export class PermanentError extends AppError {
  constructor(message: string, details?: unknown) {
    super("PERMANENT", message, 422, details);
    this.name = "PermanentError";
  }
}

export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded",
    public readonly retryAfterSec: number = 60,
    details?: unknown,
  ) {
    super("RATE_LIMITED", message, 429, details);
    this.name = "RateLimitError";
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error", details?: unknown) {
    super("INTERNAL_SERVER_ERROR", message, 500, details);
    this.name = "InternalServerError";
  }
}