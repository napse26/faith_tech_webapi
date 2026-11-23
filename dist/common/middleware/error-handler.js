"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const app_error_1 = require("../errors/app-error");
const api_response_1 = require("../types/api-response");
const logger_1 = require("../utils/logger");
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
    // Unhandled / Unexpected internal error
    logger_1.logger.error({ err, traceId, path: req.path }, 'Unhandled Internal Server Error');
    res.status(500).json((0, api_response_1.createErrorResponse)('An unexpected internal server error occurred', [{ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred' }], traceId, 'INTERNAL_SERVER_ERROR'));
}
