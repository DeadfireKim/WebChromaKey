export * from './camera';
export * from './segmentation';
export * from './compositor';

export interface PerformanceState {
  fps: number;
  isProcessing: boolean;
}

export interface ChromaKeyState {
  camera: import('./camera').CameraState;
  background: import('./compositor').BackgroundState;
  segmentation: import('./segmentation').SegmentationState;
  performance: PerformanceState;
}
