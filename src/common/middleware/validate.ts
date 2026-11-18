import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/app-error';
import { ApiFieldError } from '../types/api-response';

interface ValidationSchemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const fieldErrors: ApiFieldError[] = error.issues.map((issue) => ({
          code: 'VALIDATION_ERROR',
          field: issue.path.join('.'),
          message: issue.message
        }));
        next(new ValidationError('Request validation failed', fieldErrors));
      } else {
        next(error);
      }
    }
  };
}
