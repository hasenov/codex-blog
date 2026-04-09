import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => {
    return (request: Request, _response: Response, next: NextFunction) => {
        request.body = schema.parse(request.body);
        next();
    };
};
