import { DomainError } from '../../shared/errors/domain-error.js';
import type { MediaActor } from '../media.types.js';

export const assertCanCreateMedia = (actor: MediaActor): void => {
    if (actor.role !== 'author' && actor.role !== 'editor' && actor.role !== 'admin') {
        throw new DomainError('Actor cannot create media assets.', 'INSUFFICIENT_ROLE');
    }
};
