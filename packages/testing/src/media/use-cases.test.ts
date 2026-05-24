import { describe, expect, it } from 'vitest';

import { CreateMediaAssetUseCase, GetMediaAssetByIdUseCase, ListMediaAssetsUseCase } from '@codex-blog/application';

import { createMediaTestContext } from './create-media-test-context.js';

describe('media use cases', () => {
    it('creates and lists active media assets', async () => {
        const context = createMediaTestContext();
        const created = await new CreateMediaAssetUseCase(context.dependencies).execute({
            actor: context.actor.author,
            originalFilename: 'hero.png',
            mimeType: 'image/png',
            sizeBytes: 2048,
            storageKey: 'media/hero.png',
            url: 'https://cdn.example.com/media/hero.png',
            altText: 'Hero image',
        });

        expect((await new ListMediaAssetsUseCase(context.dependencies).execute()).map((asset) => asset.id)).toEqual([created.id]);
        expect((await new GetMediaAssetByIdUseCase(context.dependencies).execute({ id: created.id })).altText).toBe('Hero image');
    });

    it('rejects media creation for readers', async () => {
        const context = createMediaTestContext();

        await expect(
            new CreateMediaAssetUseCase(context.dependencies).execute({
                actor: context.actor.reader,
                originalFilename: 'hero.png',
                mimeType: 'image/png',
                sizeBytes: 2048,
                storageKey: 'media/hero.png',
                url: 'https://cdn.example.com/media/hero.png',
            })
        ).rejects.toMatchObject({ code: 'INSUFFICIENT_ROLE' });
    });
});
