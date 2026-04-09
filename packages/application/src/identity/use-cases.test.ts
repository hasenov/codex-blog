import { describe, expect, it } from 'vitest';

import { ApplicationError } from '../shared/errors/application-error.js';

describe('ApplicationError', () => {
    it('captures code and status code', () => {
        const error = new ApplicationError('boom', 'APP_ERROR', 418);

        expect(error.code).toBe('APP_ERROR');
        expect(error.statusCode).toBe(418);
    });
});
