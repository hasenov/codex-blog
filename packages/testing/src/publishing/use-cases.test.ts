import { describe, expect, it } from 'vitest';

import {
    ArchivePostUseCase,
    BadRequestError,
    ConflictError,
    CreateDraftPostUseCase,
    ForbiddenError,
    PublishPostUseCase,
    RestorePostRevisionUseCase,
    SchedulePostUseCase,
    UpdateDraftPostUseCase,
} from '@codex-blog/application';

import { createDraftInput, createPublishingTestContext } from './create-publishing-test-context.js';

describe('publishing use cases', () => {
    it('creates draft posts and rejects duplicate slugs', async () => {
        const context = createPublishingTestContext();
        const useCase = new CreateDraftPostUseCase(context.dependencies);

        const post = await useCase.execute({
            actor: context.actor.author,
            ...createDraftInput(),
        });

        await expect(
            useCase.execute({
                actor: context.actor.author,
                ...createDraftInput({
                    title: 'Another title',
                }),
            })
        ).rejects.toThrow(ConflictError);
        expect(post.status).toBe('draft');
        expect(post.revisions).toHaveLength(1);
    });

    it('updates own drafts and persists a new revision', async () => {
        const context = createPublishingTestContext();
        const created = await new CreateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            ...createDraftInput(),
        });

        const updated = await new UpdateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            postId: created.id,
            title: 'Updated post title',
            excerpt: 'Updated excerpt',
            content: {
                version: 1,
                blocks: [{ type: 'paragraph', text: 'Updated content' }],
            },
            seo: {},
        });

        expect(updated.title).toBe('Updated post title');
        expect(updated.revisions).toHaveLength(2);
    });

    it('enforces author ownership and reader restrictions', async () => {
        const context = createPublishingTestContext();
        const created = await new CreateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            ...createDraftInput(),
        });

        await expect(
            new UpdateDraftPostUseCase(context.dependencies).execute({
                actor: context.actor.otherAuthor,
                postId: created.id,
                title: 'Rejected title',
                excerpt: '',
                content: {
                    version: 1,
                    blocks: [{ type: 'paragraph', text: 'Rejected content' }],
                },
                seo: {},
            })
        ).rejects.toThrow(ForbiddenError);
        await expect(
            new CreateDraftPostUseCase(context.dependencies).execute({
                actor: context.actor.reader,
                ...createDraftInput({
                    slug: 'reader-post',
                }),
            })
        ).rejects.toThrow(ForbiddenError);
    });

    it('allows editors to publish, schedule, and archive posts', async () => {
        const publishContext = createPublishingTestContext();
        const publishedDraft = await new CreateDraftPostUseCase(publishContext.dependencies).execute({
            actor: publishContext.actor.author,
            ...createDraftInput(),
        });
        const published = await new PublishPostUseCase(publishContext.dependencies).execute({
            actor: publishContext.actor.editor,
            postId: publishedDraft.id,
        });

        const scheduleContext = createPublishingTestContext();
        const scheduledDraft = await new CreateDraftPostUseCase(scheduleContext.dependencies).execute({
            actor: scheduleContext.actor.author,
            ...createDraftInput(),
        });
        const scheduled = await new SchedulePostUseCase(scheduleContext.dependencies).execute({
            actor: scheduleContext.actor.editor,
            postId: scheduledDraft.id,
            scheduledFor: '2026-01-02T00:00:00.000Z',
        });
        const archived = await new ArchivePostUseCase(scheduleContext.dependencies).execute({
            actor: scheduleContext.actor.editor,
            postId: scheduledDraft.id,
        });

        expect(published.status).toBe('published');
        expect(scheduled.status).toBe('scheduled');
        expect(archived.status).toBe('archived');
    });

    it('rejects authors managing lifecycle and invalid schedules', async () => {
        const context = createPublishingTestContext();
        const created = await new CreateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            ...createDraftInput(),
        });

        await expect(
            new PublishPostUseCase(context.dependencies).execute({
                actor: context.actor.author,
                postId: created.id,
            })
        ).rejects.toThrow(ForbiddenError);
        await expect(
            new SchedulePostUseCase(context.dependencies).execute({
                actor: context.actor.editor,
                postId: created.id,
                scheduledFor: '2025-01-01T00:00:00.000Z',
            })
        ).rejects.toThrow(BadRequestError);
    });

    it('restores revisions and rejects missing revisions', async () => {
        const context = createPublishingTestContext();
        const created = await new CreateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            ...createDraftInput(),
        });
        const updated = await new UpdateDraftPostUseCase(context.dependencies).execute({
            actor: context.actor.author,
            postId: created.id,
            title: 'Updated post title',
            excerpt: 'Updated excerpt',
            content: {
                version: 1,
                blocks: [{ type: 'paragraph', text: 'Updated content' }],
            },
            seo: {},
        });

        const restored = await new RestorePostRevisionUseCase(context.dependencies).execute({
            actor: context.actor.author,
            postId: created.id,
            revisionId: created.revisions[0]?.id ?? 'missing-revision',
        });

        await expect(
            new RestorePostRevisionUseCase(context.dependencies).execute({
                actor: context.actor.author,
                postId: created.id,
                revisionId: 'missing-revision',
            })
        ).rejects.toThrow(BadRequestError);
        expect(updated.title).toBe('Updated post title');
        expect(restored.title).toBe('Initial post title');
        expect(restored.revisions).toHaveLength(3);
    });
});
