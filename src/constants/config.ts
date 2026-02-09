// Camera configuration
export const CAMERA_CONFIG = {
  DEFAULT_WIDTH: 640,
  DEFAULT_HEIGHT: 480,
  DEFAULT_FRAME_RATE: 60,
  MIN_FRAME_RATE: 15,
  MAX_FRAME_RATE: 60,
} as const;

// Canvas configuration
export const CANVAS_CONFIG = {
  DEFAULT_WIDTH: 640,
  DEFAULT_HEIGHT: 480,
} as const;

// Performance configuration
export const PERFORMANCE_CONFIG = {
  TARGET_FPS: 60,
  FPS_UPDATE_INTERVAL: 1000, // ms
} as const;

// MediaPipe configuration
export const MEDIAPIPE_CONFIG = {
  CDN_URL: process.env.NEXT_PUBLIC_MEDIAPIPE_CDN ||
    'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
  MODEL_SELECTION: {
    LOW: 0,
    HIGH: 1,
  },
} as const;
