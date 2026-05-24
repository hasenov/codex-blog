import { describe, expect, it } from 'vitest';

import { MimeType } from './mime-type.js';
import { OriginalFilename } from './original-filename.js';
import { StorageKey } from './storage-key.js';

describe('media value objects', () => {
    it('normalizes valid values', () => {
        expect(OriginalFilename.create(' image.jpg ').toString()).toBe('image.jpg');
        expect(MimeType.create('IMAGE/JPEG').toString()).toBe('image/jpeg');
        expect(StorageKey.create(' media/image.jpg ').toString()).toBe('media/image.jpg');
    });

    it('rejects invalid values', () => {
        expect(() => OriginalFilename.create('   ')).toThrowError(/filename/i);
        expect(() => MimeType.create('not-a-mime')).toThrowError(/mime/i);
        expect(() => StorageKey.create('   ')).toThrowError(/storage key/i);
    });
});
