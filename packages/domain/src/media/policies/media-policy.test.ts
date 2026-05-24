import { describe, expect, it } from 'vitest';

import { assertCanCreateMedia } from './media-policy.js';

describe('media policy', () => {
    it('allows authors, editors, and admins to create media', () => {
        expect(() => assertCanCreateMedia({ role: 'author', userId: 'author-0001' })).not.toThrow();
        expect(() => assertCanCreateMedia({ role: 'editor', userId: 'editor-0001' })).not.toThrow();
        expect(() => assertCanCreateMedia({ role: 'admin', userId: 'admin-0001' })).not.toThrow();
    });

    it('rejects readers', () => {
        expect(() => assertCanCreateMedia({ role: 'reader', userId: 'reader-0001' })).toThrowError(/cannot create media/i);
    });
});
