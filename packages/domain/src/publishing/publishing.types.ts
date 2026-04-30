export const POST_STATUSES = ['draft', 'scheduled', 'published', 'archived'] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

export type PublishingActorRole = 'admin' | 'editor' | 'author' | 'reader';

export interface PublishingActor {
    role: PublishingActorRole;
    userId: string;
}
