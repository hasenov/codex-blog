import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { ZodError } from 'zod';

import { BadRequestError } from '@codex-blog/application';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => {
    return (request: Request, _response: Response, next: NextFunction) => {
        try {
            request.body = schema.parse(request.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(new BadRequestError('Request body validation failed.', 'VALIDATION_ERROR'));
                return;
            }

            next(error);
        }
    };
};
