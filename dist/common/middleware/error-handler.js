"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const client_1 = require("@prisma/client");
const app_error_1 = require("../errors/app-error");
const api_response_1 = require("../types/api-response");
const logger_1 = require("../utils/logger");
const database_1 = require("../../config/database");
function errorHandler(err, req, res, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
next) {
    const traceId = req.traceId || 'unknown-trace-id';
    if (err instanceof app_error_1.AppError) {
        if (err.statusCode >= 500) {
            logger_1.logger.error({ err, traceId, path: req.path }, 'Operational 5xx error');
        }
        else {
            logger_1.logger.warn({ err: err.message, code: err.errorCode, traceId, path: req.path }, 'Client error');
        }
        res.status(err.statusCode).json((0, api_response_1.createErrorResponse)(err.message, err.errors, traceId, err.errorCode));
        return;
    }
    // Handle SyntaxError (e.g. malformed JSON in request body)
    if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        res.status(400).json((0, api_response_1.createErrorResponse)('Malformed JSON in request body', [{ code: 'INVALID_JSON', message: err.message }], traceId, 'INVALID_JSON'));
        return;
    }
    // Handle database connection drops / unavailable
    if ((0, database_1.isConnectionError)(err)) {
        logger_1.logger.error({ err: err.message, traceId, path: req.path }, 'Database connection error / pool exhausted');
        res.setHeader('Retry-After', '1');
        res.status(503).json((0, api_response_1.createErrorResponse)('Database service is temporarily unavailable. Please retry in a moment.', [{ code: 'DATABASE_UNAVAILABLE', message: 'The database connection is temporarily unavailable' }], traceId, 'DATABASE_UNAVAILABLE'));
        return;
    }
    // Handle Prisma Known Request Errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
        logger_1.logger.warn({ code: err.code, meta: err.meta, message: err.message, traceId, path: req.path }, 'Prisma known error');
        if (err.code === 'P2002') {
            const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : err.meta?.target || 'field';
            res.status(409).json((0, api_response_1.createErrorResponse)(`A record with this ${target} already exists`, [{ code: 'DUPLICATE_RESOURCE', message: `Duplicate value on ${target}` }], traceId, 'DUPLICATE_RESOURCE'));
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json((0, api_response_1.createErrorResponse)('The requested resource was not found', [{ code: 'RESOURCE_NOT_FOUND', message: 'Record not found' }], traceId, 'RESOURCE_NOT_FOUND'));
            return;
        }
        if (err.code === 'P2003') {
            res.status(400).json((0, api_response_1.createErrorResponse)('Invalid reference to related entity', [{ code: 'FOREIGN_KEY_VIOLATION', message: 'Referenced entity does not exist or has dependent records' }], traceId, 'FOREIGN_KEY_VIOLATION'));
            return;
        }
        if (err.code === 'P2000') {
            res.status(400).json((0, api_response_1.createErrorResponse)('Provided value exceeds the allowed length', [{ code: 'VALUE_TOO_LONG', message: err.message }], traceId, 'VALUE_TOO_LONG'));
            return;
        }
        if (err.code === 'P2014') {
            res.status(400).json((0, api_response_1.createErrorResponse)('Relation constraint violation', [{ code: 'RELATION_VIOLATION', message: err.message }], traceId, 'RELATION_VIOLATION'));
            return;
        }
    }
    // Handle Prisma Validation Errors
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        logger_1.logger.warn({ message: err.message, traceId, path: req.path }, 'Prisma validation error');
        res.status(400).json((0, api_response_1.createErrorResponse)('Database query validation failed', [{ code: 'DATABASE_VALIDATION_ERROR', message: 'Invalid data format provided to database query' }], traceId, 'DATABASE_VALIDATION_ERROR'));
        return;
    }
    // Unhandled / Unexpected internal error
    logger_1.logger.error({ err, traceId, path: req.path }, 'Unhandled Internal Server Error');
    res.status(500).json((0, api_response_1.createErrorResponse)('An unexpected internal server error occurred', [{ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred' }], traceId, 'INTERNAL_SERVER_ERROR'));
}
