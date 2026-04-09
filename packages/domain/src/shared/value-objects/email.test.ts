import { describe, expect, it } from 'vitest';

import { Email } from './email.js';

describe('Email', () => {
    it('normalizes to lowercase', () => {
        expect(Email.create('Test@Example.com').toString()).toBe('test@example.com');
    });

    it('rejects invalid email', () => {
        expect(() => Email.create('invalid')).toThrowError(/invalid/i);
    });
});
