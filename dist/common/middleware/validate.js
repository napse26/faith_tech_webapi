"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const app_error_1 = require("../errors/app-error");
function validate(schemas) {
    return async (req, res, next) => {
        try {
            if (schemas.body) {
                req.body = await schemas.body.parseAsync(req.body);
            }
            if (schemas.query) {
                req.query = (await schemas.query.parseAsync(req.query));
            }
            if (schemas.params) {
                req.params = (await schemas.params.parseAsync(req.params));
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const fieldErrors = error.issues.map((issue) => ({
                    code: 'VALIDATION_ERROR',
                    field: issue.path.join('.'),
                    message: issue.message
                }));
                next(new app_error_1.ValidationError('Request validation failed', fieldErrors));
            }
            else {
                next(error);
            }
        }
    };
}
