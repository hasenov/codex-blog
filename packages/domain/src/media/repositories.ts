import type { MediaAsset } from './entities/media-asset.js';

export interface MediaAssetRepository {
    findById(id: string): Promise<MediaAsset | null>;
    listActive(): Promise<MediaAsset[]>;
    save(asset: MediaAsset): Promise<void>;
}
