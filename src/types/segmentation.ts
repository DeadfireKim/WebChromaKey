export type SegmentationQuality = 'low' | 'medium' | 'high';

export interface SegmentationResult {
  mask: ImageData;
  width: number;
  height: number;
}

export interface SegmentationState {
  isActive: boolean;
  quality: SegmentationQuality;
  blurStrength: number;
}
