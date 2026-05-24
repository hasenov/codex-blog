import type { Clock, IdGenerator } from '@codex-blog/application';
import { InMemoryMediaAssetRepository, InMemoryTransactionManager } from '@codex-blog/infrastructure';

class FixedClock implements Clock {
    private current = new Date('2026-01-01T00:00:00.000Z');

    public now(): Date {
        return this.current;
    }
}

class SequenceIdGenerator implements IdGenerator {
    private index = 0;

    public generate(): string {
        this.index += 1;
        return `generated-media-${this.index.toString().padStart(4, '0')}`;
    }
}

export const createMediaTestContext = () => {
    const clock = new FixedClock();
    const mediaAssetRepository = new InMemoryMediaAssetRepository();

    return {
        actor: {
            admin: { role: 'admin', userId: 'admin-0001' },
            author: { role: 'author', userId: 'author-0001' },
            editor: { role: 'editor', userId: 'editor-0001' },
            reader: { role: 'reader', userId: 'reader-0001' },
        } as const,
        dependencies: {
            mediaAssetRepository,
            idGenerator: new SequenceIdGenerator(),
            clock,
            transactionManager: new InMemoryTransactionManager(),
        },
        mediaAssetRepository,
    };
};
