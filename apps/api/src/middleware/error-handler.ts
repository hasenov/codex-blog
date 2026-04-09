import type { NextFunction, Request, Response } from 'express';

import { ApplicationError } from '@codex-blog/application';
import type { ProblemDetailsDto } from '@codex-blog/application';

import type { RequestContextLocals } from './request-context.js';

export const errorHandler = (
    error: unknown,
    _request: Request,
    response: Response<ProblemDetailsDto, RequestContextLocals>,
    next: NextFunction
): void => {
    void next;

    if (error instanceof ApplicationError) {
        response.status(error.statusCode).json({
            type: `https://codex-blog.dev/errors/${error.code.toLowerCase()}`,
            title: error.name,
            status: error.statusCode,
            detail: error.message,
            code: error.code,
            correlationId: response.locals.correlationId,
        });
        return;
    }

    if (error instanceof Error) {
        response.status(500).json({
            type: 'https://codex-blog.dev/errors/internal-server-error',
            title: 'InternalServerError',
            status: 500,
            detail: error.message,
            code: 'INTERNAL_SERVER_ERROR',
            correlationId: response.locals.correlationId,
        });
        return;
    }

    response.status(500).json({
        type: 'https://codex-blog.dev/errors/internal-server-error',
        title: 'InternalServerError',
        status: 500,
        detail: 'An unknown error occurred.',
        code: 'INTERNAL_SERVER_ERROR',
        correlationId: response.locals.correlationId,
    });
};
