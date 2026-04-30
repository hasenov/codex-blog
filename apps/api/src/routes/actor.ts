import type { Response } from 'express';

import type { RequestContextLocals } from '../middleware/request-context.js';

export type ActorDto = { role: 'admin' | 'editor' | 'author' | 'reader'; userId: string };

export const getActor = (response: Response<unknown, RequestContextLocals>): ActorDto => {
    const actor = response.locals.actor;

    if (actor === undefined) {
        throw new Error('Authenticated actor context is missing.');
    }

    return { userId: actor.userId, role: actor.role };
};
