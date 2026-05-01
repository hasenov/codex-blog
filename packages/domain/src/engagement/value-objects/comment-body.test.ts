import { describe, expect, it } from 'vitest';

import { CommentBody } from './comment-body.js';

describe('CommentBody', () => {
    it('trims valid comments', () => {
        expect(CommentBody.create('  Nice post  ').toString()).toBe('Nice post');
    });

    it('rejects empty and oversized comments', () => {
        expect(() => CommentBody.create('   ')).toThrow('Comment body cannot be empty.');
        expect(() => CommentBody.create('a'.repeat(2001))).toThrow('Comment body must be at most 2000 characters long.');
    });
});
