import { describe, expect, it } from 'vitest';

import { DomainError } from '../../shared/errors/domain-error.js';
import { PostTitle } from './post-title.js';
import { RichContent } from './rich-content.js';
import { SeoMetadata } from './seo-metadata.js';

describe('publishing value objects', () => {
    it('validates post titles', () => {
        expect(PostTitle.create('  A useful title  ').toString()).toBe('A useful title');
        expect(() => PostTitle.create('No')).toThrow(DomainError);
    });

    it('validates SEO metadata', () => {
        const metadata = SeoMetadata.create({
            title: 'SEO title',
            canonicalUrl: 'https://example.com/posts/hello',
        });

        expect(metadata.toPrimitives().canonicalUrl).toBe('https://example.com/posts/hello');
        expect(() => SeoMetadata.create({ canonicalUrl: 'not-a-url' })).toThrow(DomainError);
    });

    it('validates small rich content blocks', () => {
        const content = RichContent.create({
            version: 1,
            blocks: [
                { type: 'heading', level: 2, text: 'Heading' },
                { type: 'paragraph', text: 'Paragraph' },
                { type: 'image', url: 'https://example.com/image.jpg', alt: 'Image' },
                { type: 'embed', url: 'https://example.com/video', provider: 'video' },
                { type: 'code', code: 'console.log("hello");', language: 'ts' },
            ],
        });

        expect(content.toPrimitives().blocks).toHaveLength(5);
        expect(() => RichContent.create({ version: 1, blocks: [] })).toThrow(DomainError);
    });
});
