import { describe, expect, it } from 'vitest';

import { assertCanManageTaxonomy } from './taxonomy-policy.js';

describe('taxonomy policy', () => {
    it('allows editors and admins to manage taxonomy', () => {
        expect(() => assertCanManageTaxonomy({ role: 'editor', userId: 'editor-0001' })).not.toThrow();
        expect(() => assertCanManageTaxonomy({ role: 'admin', userId: 'admin-0001' })).not.toThrow();
    });

    it('rejects authors and readers', () => {
        expect(() => assertCanManageTaxonomy({ role: 'author', userId: 'author-0001' })).toThrow(
            'Only editors and admins can manage taxonomy.'
        );
        expect(() => assertCanManageTaxonomy({ role: 'reader', userId: 'reader-0001' })).toThrow(
            'Only editors and admins can manage taxonomy.'
        );
    });
});
