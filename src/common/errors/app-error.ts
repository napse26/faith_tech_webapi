import { ApiFieldError } from '../types/api-response';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly errors: ApiFieldError[];
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode = 500,
    errorCode = 'INTERNAL_SERVER_ERROR',
    errors: ApiFieldError[] = [],
    isOperational = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.errors = errors.length > 0 ? errors : [{ code: errorCode, message }];
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Invalid request', errorCode = 'BAD_REQUEST', errors: ApiFieldError[] = []) {
    super(message, 400, errorCode, errors);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', errors: ApiFieldError[] = []) {
    super(message, 400, 'VALIDATION_ERROR', errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Missing or invalid authentication', errorCode = 'UNAUTHORIZED') {
    super(message, 401, errorCode);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Access denied', errorCode = 'FORBIDDEN') {
    super(message, 403, errorCode);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
    super(message, 404, errorCode);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource conflict or duplicate state', errorCode = 'CONFLICT') {
    super(message, 409, errorCode);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Please try again later.', errorCode = 'RATE_LIMIT_EXCEEDED') {
    super(message, 429, errorCode);
  }
}
