export type BackgroundMode = 'replace' | 'blur' | 'none';

export interface CompositeOptions {
  backgroundMode: BackgroundMode;
  blurStrength?: number;
  edgeBlending?: number;
}

export interface BackgroundState {
  image: HTMLImageElement | null;
  mode: BackgroundMode;
}
