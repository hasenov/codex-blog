import { describe, expect, it } from 'vitest';

import { TaxonomyName } from './taxonomy-name.js';

describe('TaxonomyName', () => {
    it('normalizes whitespace', () => {
        expect(TaxonomyName.create('  Product   Engineering  ').toString()).toBe('Product Engineering');
    });

    it('rejects invalid names', () => {
        expect(() => TaxonomyName.create('A')).toThrow('Taxonomy name must be at least 2 characters long.');
        expect(() => TaxonomyName.create('a'.repeat(81))).toThrow('Taxonomy name must be at most 80 characters long.');
    });
});
