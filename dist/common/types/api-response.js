"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSuccessResponse = createSuccessResponse;
exports.createErrorResponse = createErrorResponse;
function createSuccessResponse(data, message = 'Operation completed successfully', traceId = '') {
    return {
        success: true,
        message,
        data,
        errors: [],
        traceId
    };
}
function createErrorResponse(message = 'Request could not be processed', errors = [], traceId = '', errorCode = 'ERROR') {
    const primaryCode = errors.length > 0 && errors[0].code ? errors[0].code : errorCode;
    return {
        success: false,
        message,
        data: null,
        error: {
            code: primaryCode,
            details: errors.length > 1 ? errors : null
        },
        errors,
        traceId
    };
}
