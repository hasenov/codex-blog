import { DomainError } from '../../shared/errors/domain-error.js';
import type { TaxonomyActor } from '../taxonomy.types.js';

export const assertCanManageTaxonomy = (actor: TaxonomyActor): void => {
    if (actor.role !== 'admin' && actor.role !== 'editor') {
        throw new DomainError('Only editors and admins can manage taxonomy.', 'INSUFFICIENT_ROLE');
    }
};
