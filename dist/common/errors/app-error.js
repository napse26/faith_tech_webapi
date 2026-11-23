"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.ForbiddenError = exports.UnauthorizedError = exports.ValidationError = exports.BadRequestError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    errorCode;
    errors;
    isOperational;
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR', errors = [], isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.errors = errors.length > 0 ? errors : [{ code: errorCode, message }];
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class BadRequestError extends AppError {
    constructor(message = 'Invalid request', errorCode = 'BAD_REQUEST', errors = []) {
        super(message, 400, errorCode, errors);
    }
}
exports.BadRequestError = BadRequestError;
class ValidationError extends AppError {
    constructor(message = 'Validation failed', errors = []) {
        super(message, 400, 'VALIDATION_ERROR', errors);
    }
}
exports.ValidationError = ValidationError;
class UnauthorizedError extends AppError {
    constructor(message = 'Missing or invalid authentication', errorCode = 'UNAUTHORIZED') {
        super(message, 401, errorCode);
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError extends AppError {
    constructor(message = 'Access denied', errorCode = 'FORBIDDEN') {
        super(message, 403, errorCode);
    }
}
exports.ForbiddenError = ForbiddenError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
        super(message, 404, errorCode);
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict or duplicate state', errorCode = 'CONFLICT') {
        super(message, 409, errorCode);
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Too many requests. Please try again later.', errorCode = 'RATE_LIMIT_EXCEEDED') {
        super(message, 429, errorCode);
    }
}
exports.RateLimitError = RateLimitError;
