import { DomainError } from '../../shared/errors/domain-error.js';

export interface SeoMetadataProps {
    canonicalUrl?: string | undefined;
    description?: string | undefined;
    ogDescription?: string | undefined;
    ogImageUrl?: string | undefined;
    ogTitle?: string | undefined;
    title?: string | undefined;
}

const ensureOptionalLength = (value: string | undefined, maxLength: number, code: string): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    const normalizedValue = value.trim();

    if (normalizedValue.length === 0 || normalizedValue.length > maxLength) {
        throw new DomainError('SEO metadata field is invalid.', code);
    }

    return normalizedValue;
};

const ensureOptionalUrl = (value: string | undefined, code: string): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    try {
        return new URL(value.trim()).toString();
    } catch {
        throw new DomainError('SEO metadata URL is invalid.', code);
    }
};

export class SeoMetadata {
    private constructor(private readonly props: SeoMetadataProps) {}

    public static create(props: SeoMetadataProps = {}): SeoMetadata {
        const title = ensureOptionalLength(props.title, 70, 'INVALID_SEO_TITLE');
        const description = ensureOptionalLength(props.description, 160, 'INVALID_SEO_DESCRIPTION');
        const canonicalUrl = ensureOptionalUrl(props.canonicalUrl, 'INVALID_CANONICAL_URL');
        const ogTitle = ensureOptionalLength(props.ogTitle, 70, 'INVALID_OG_TITLE');
        const ogDescription = ensureOptionalLength(props.ogDescription, 160, 'INVALID_OG_DESCRIPTION');
        const ogImageUrl = ensureOptionalUrl(props.ogImageUrl, 'INVALID_OG_IMAGE_URL');

        return new SeoMetadata({
            ...(title === undefined ? {} : { title }),
            ...(description === undefined ? {} : { description }),
            ...(canonicalUrl === undefined ? {} : { canonicalUrl }),
            ...(ogTitle === undefined ? {} : { ogTitle }),
            ...(ogDescription === undefined ? {} : { ogDescription }),
            ...(ogImageUrl === undefined ? {} : { ogImageUrl }),
        });
    }

    public toPrimitives(): SeoMetadataProps {
        return { ...this.props };
    }
}
