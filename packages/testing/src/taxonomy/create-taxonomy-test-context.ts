import type { Clock, IdGenerator } from '@codex-blog/application';
import { InMemoryCategoryRepository, InMemoryTagRepository, InMemoryTransactionManager } from '@codex-blog/infrastructure';

class FixedClock implements Clock {
    private current = new Date('2026-01-01T00:00:00.000Z');

    public now(): Date {
        return this.current;
    }

    public setCurrent(value: Date): void {
        this.current = value;
    }
}

class SequenceIdGenerator implements IdGenerator {
    private index = 0;

    public generate(): string {
        this.index += 1;
        return `generated-taxonomy-${this.index.toString().padStart(4, '0')}`;
    }
}

export const createTaxonomyTestContext = () => {
    const clock = new FixedClock();
    const categoryRepository = new InMemoryCategoryRepository();
    const tagRepository = new InMemoryTagRepository();

    return {
        actor: {
            admin: { role: 'admin', userId: 'admin-0001' },
            author: { role: 'author', userId: 'author-0001' },
            editor: { role: 'editor', userId: 'editor-0001' },
            reader: { role: 'reader', userId: 'reader-0001' },
        } as const,
        categoryRepository,
        clock,
        dependencies: {
            categoryRepository,
            tagRepository,
            idGenerator: new SequenceIdGenerator(),
            clock,
            transactionManager: new InMemoryTransactionManager(),
        },
        tagRepository,
    };
};
