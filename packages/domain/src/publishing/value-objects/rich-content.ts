import { DomainError } from '../../shared/errors/domain-error.js';
import { EntityId } from '../../shared/value-objects/entity-id.js';

export type RichContentBlock =
    | { text: string; type: 'paragraph' }
    | { level: 1 | 2 | 3; text: string; type: 'heading' }
    | { alt?: string | undefined; assetId?: string | undefined; caption?: string | undefined; type: 'image'; url: string }
    | { provider?: string | undefined; type: 'embed'; url: string }
    | { code: string; language?: string | undefined; type: 'code' };

export interface RichContentProps {
    blocks: RichContentBlock[];
    version: 1;
}

const normalizeRequiredText = (value: string, maxLength: number, code: string): string => {
    const normalizedValue = value.trim();

    if (normalizedValue.length === 0 || normalizedValue.length > maxLength) {
        throw new DomainError('Rich content text is invalid.', code);
    }

    return normalizedValue;
};

const normalizeOptionalText = (value: string | undefined, maxLength: number, code: string): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    return normalizeRequiredText(value, maxLength, code);
};

const normalizeUrl = (value: string, code: string): string => {
    try {
        return new URL(value.trim()).toString();
    } catch {
        throw new DomainError('Rich content URL is invalid.', code);
    }
};

const normalizeOptionalEntityId = (value: string | undefined): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    return EntityId.create(value).toString();
};

const normalizeBlock = (block: RichContentBlock): RichContentBlock => {
    switch (block.type) {
        case 'paragraph':
            return {
                type: 'paragraph',
                text: normalizeRequiredText(block.text, 10000, 'INVALID_RICH_CONTENT_PARAGRAPH'),
            };
        case 'heading':
            return {
                type: 'heading',
                level: block.level,
                text: normalizeRequiredText(block.text, 240, 'INVALID_RICH_CONTENT_HEADING'),
            };
        case 'image': {
            const alt = normalizeOptionalText(block.alt, 240, 'INVALID_RICH_CONTENT_IMAGE_ALT');
            const caption = normalizeOptionalText(block.caption, 500, 'INVALID_RICH_CONTENT_IMAGE_CAPTION');
            const assetId = normalizeOptionalEntityId(block.assetId);

            return {
                type: 'image',
                url: normalizeUrl(block.url, 'INVALID_RICH_CONTENT_IMAGE_URL'),
                ...(alt === undefined ? {} : { alt }),
                ...(assetId === undefined ? {} : { assetId }),
                ...(caption === undefined ? {} : { caption }),
            };
        }
        case 'embed': {
            const provider = normalizeOptionalText(block.provider, 80, 'INVALID_RICH_CONTENT_EMBED_PROVIDER');

            return {
                type: 'embed',
                url: normalizeUrl(block.url, 'INVALID_RICH_CONTENT_EMBED_URL'),
                ...(provider === undefined ? {} : { provider }),
            };
        }
        case 'code': {
            const language = normalizeOptionalText(block.language, 80, 'INVALID_RICH_CONTENT_CODE_LANGUAGE');

            return {
                type: 'code',
                code: normalizeRequiredText(block.code, 20000, 'INVALID_RICH_CONTENT_CODE'),
                ...(language === undefined ? {} : { language }),
            };
        }
    }
};

export class RichContent {
    private constructor(private readonly props: RichContentProps) {}

    public static create(props: RichContentProps): RichContent {
        if (props.version !== 1) {
            throw new DomainError('Rich content version is unsupported.', 'UNSUPPORTED_RICH_CONTENT_VERSION');
        }

        if (props.blocks.length === 0 || props.blocks.length > 200) {
            throw new DomainError('Rich content must contain between 1 and 200 blocks.', 'INVALID_RICH_CONTENT');
        }

        return new RichContent({
            version: 1,
            blocks: props.blocks.map((block) => normalizeBlock(block)),
        });
    }

    public toPrimitives(): RichContentProps {
        return {
            version: this.props.version,
            blocks: this.props.blocks.map((block) => ({ ...block })),
        };
    }
}
