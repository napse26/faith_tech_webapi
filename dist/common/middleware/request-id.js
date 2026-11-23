"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const uuid_1 = require("uuid");
function requestIdMiddleware(req, res, next) {
    const existingId = req.header('x-trace-id') || req.header('x-correlation-id');
    const traceId = existingId && existingId.length < 128 ? existingId : (0, uuid_1.v4)();
    req.traceId = traceId;
    res.setHeader('X-Trace-Id', traceId);
    next();
}
