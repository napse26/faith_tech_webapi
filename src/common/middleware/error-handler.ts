import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';
import { createErrorResponse } from '../types/api-response';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void {
  const traceId = req.traceId || 'unknown-trace-id';

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, traceId, path: req.path }, 'Operational 5xx error');
    } else {
      logger.warn({ err: err.message, code: err.errorCode, traceId, path: req.path }, 'Client error');
    }

    res.status(err.statusCode).json(createErrorResponse(err.message, err.errors, traceId, err.errorCode));
    return;
  }

  // Handle SyntaxError (e.g. malformed JSON in request body)
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json(
      createErrorResponse('Malformed JSON in request body', [{ code: 'INVALID_JSON', message: err.message }], traceId, 'INVALID_JSON')
    );
    return;
  }

  // Unhandled / Unexpected internal error
  logger.error({ err, traceId, path: req.path }, 'Unhandled Internal Server Error');

  res.status(500).json(
    createErrorResponse(
      'An unexpected internal server error occurred',
      [{ code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected internal server error occurred' }],
      traceId,
      'INTERNAL_SERVER_ERROR'
    )
  );
}
