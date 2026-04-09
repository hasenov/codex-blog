import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { runWithRequestScope } from '../app/request-scope.js';

export interface AuthenticatedActor {
    userId: string;
    role: 'admin' | 'editor' | 'author' | 'reader';
    sessionId: string;
}

export interface RequestContextLocals {
    actor?: AuthenticatedActor;
    correlationId: string;
}

export const attachRequestContext = (
    request: Request,
    response: Response<unknown, RequestContextLocals>,
    next: NextFunction
): void => {
    const correlationIdHeader = request.header('x-correlation-id');
    const correlationId = correlationIdHeader === undefined || correlationIdHeader.trim() === '' ? randomUUID() : correlationIdHeader;

    response.locals.correlationId = correlationId;
    response.setHeader('x-correlation-id', correlationId);
    runWithRequestScope(correlationId, next);
};
