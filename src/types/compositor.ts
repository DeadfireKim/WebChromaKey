export type BackgroundMode = 'replace' | 'blur' | 'none';

export interface CompositeOptions {
  backgroundMode: BackgroundMode;
  blurStrength?: number;
  edgeBlending?: number;
  maskTightness?: number; // 0-1, higher = tighter mask around person
}

export interface BackgroundState {
  image: HTMLImageElement | null;
  mode: BackgroundMode;
}
