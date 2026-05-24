import { MediaAsset, type MediaAssetRepository } from '@codex-blog/domain';

export class InMemoryMediaAssetRepository implements MediaAssetRepository {
    private readonly assets = new Map<string, MediaAsset>();

    public findById(id: string): Promise<MediaAsset | null> {
        const asset = this.assets.get(id);
        return Promise.resolve(asset === undefined ? null : MediaAsset.rehydrate(asset.toPrimitives()));
    }

    public listActive(): Promise<MediaAsset[]> {
        return Promise.resolve(
            Array.from(this.assets.values())
                .filter((asset) => asset.status === 'active')
                .sort((left, right) => right.createdAt.toDate().getTime() - left.createdAt.toDate().getTime())
                .map((asset) => MediaAsset.rehydrate(asset.toPrimitives()))
        );
    }

    public save(asset: MediaAsset): Promise<void> {
        this.assets.set(asset.id.toString(), MediaAsset.rehydrate(asset.toPrimitives()));
        return Promise.resolve();
    }
}
