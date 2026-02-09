import { SegmentationQuality, SegmentationResult } from '@/types/segmentation';
import { MEDIAPIPE_CONFIG } from '@/constants/config';

// Import MediaPipe types
declare global {
  interface Window {
    SelfieSegmentation?: any;
  }
}

export class SegmentationEngine {
  private model: any = null;
  private quality: SegmentationQuality = 'medium';
  private isInitialized: boolean = false;
  private isProcessing: boolean = false;
  private lastMask: ImageData | null = null;
  private scriptLoaded: boolean = false;

  constructor() {}

  /**
   * Initialize MediaPipe Selfie Segmentation
   */
  async initialize(quality: SegmentationQuality = 'medium'): Promise<void> {
    if (this.isInitialized) {
      console.log('SegmentationEngine already initialized');
      return;
    }

    this.quality = quality;

    try {
      // Load MediaPipe script if not already loaded
      if (!this.scriptLoaded) {
        await this.loadMediaPipeScript();
      }

      // Wait for SelfieSegmentation to be available
      await this.waitForSelfieSegmentation();

      // Create SelfieSegmentation instance
      const SelfieSegmentation = window.SelfieSegmentation;
      this.model = new SelfieSegmentation({
        locateFile: (file: string) => {
          return `${MEDIAPIPE_CONFIG.CDN_URL}/${file}`;
        },
      });

      // Configure model
      this.model.setOptions({
        modelSelection: this.getModelType(quality),
        selfieMode: false, // false for rear camera, true for front camera
      });

      // Set up result callback
      this.model.onResults((results: any) => {
        this.handleResults(results);
      });

      await this.model.initialize();
      this.isInitialized = true;
      console.log('SegmentationEngine initialized successfully');
    } catch (error) {
      console.error('Failed to initialize SegmentationEngine:', error);
      throw error;
    }
  }

  /**
   * Load MediaPipe script dynamically
   */
  private loadMediaPipeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.scriptLoaded) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `${MEDIAPIPE_CONFIG.CDN_URL}/selfie_segmentation.js`;
      script.crossOrigin = 'anonymous';

      script.onload = () => {
        this.scriptLoaded = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load MediaPipe script'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Wait for SelfieSegmentation to be available
   */
  private waitForSelfieSegmentation(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxAttempts = 50;
      let attempts = 0;

      const checkInterval = setInterval(() => {
        attempts++;

        if (window.SelfieSegmentation) {
          clearInterval(checkInterval);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error('SelfieSegmentation not available after timeout'));
        }
      }, 100);
    });
  }

  /**
   * Segment a video frame
   */
  async segment(frame: ImageData): Promise<SegmentationResult> {
    if (!this.isInitialized || !this.model) {
      throw new Error('SegmentationEngine not initialized');
    }

    if (this.isProcessing) {
      // Return last mask if still processing
      if (this.lastMask) {
        return {
          mask: this.lastMask,
          width: this.lastMask.width,
          height: this.lastMask.height,
        };
      }
      throw new Error('Segmentation in progress and no previous mask available');
    }

    this.isProcessing = true;

    try {
      // Create temporary canvas for MediaPipe input
      const canvas = document.createElement('canvas');
      canvas.width = frame.width;
      canvas.height = frame.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(frame, 0, 0);

      // Send to MediaPipe
      await this.model.send({ image: canvas });

      // Wait for result (handled by onResults callback)
      await this.waitForResult();

      if (!this.lastMask) {
        throw new Error('No segmentation result received');
      }

      return {
        mask: this.lastMask,
        width: this.lastMask.width,
        height: this.lastMask.height,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Handle segmentation results from MediaPipe
   */
  private handleResults(results: any): void {
    if (!results.segmentationMask) {
      console.warn('No segmentation mask in results');
      return;
    }

    try {
      const mask = results.segmentationMask;
      console.log('[handleResults] Mask type:', mask.constructor.name);
      console.log('[handleResults] Mask properties:', Object.keys(mask));

      // Check if mask is already an ImageData
      if (mask instanceof ImageData) {
        console.log('[handleResults] Mask is already ImageData');
        this.lastMask = mask;
        return;
      }

      // Check if mask has expected structure
      if (!mask.width || !mask.height) {
        console.error('[handleResults] Mask missing width/height:', mask);
        return;
      }

      const width = mask.width;
      const height = mask.height;

      // Create temporary canvas to extract mask data
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;

      // Draw mask to canvas (MediaPipe returns mask as texture)
      ctx.drawImage(mask, 0, 0, width, height);

      // Extract as ImageData
      const imageData = ctx.getImageData(0, 0, width, height);
      console.log('[handleResults] Extracted ImageData:', imageData.width, 'x', imageData.height);

      this.lastMask = imageData;
    } catch (error) {
      console.error('[handleResults] Error processing mask:', error);
    }
  }

  /**
   * Wait for segmentation result
   */
  private waitForResult(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.lastMask) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 10);

      // Timeout after 1 second
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 1000);
    });
  }

  /**
   * Get model type based on quality
   */
  private getModelType(quality: SegmentationQuality): number {
    switch (quality) {
      case 'low':
      case 'medium':
        return MEDIAPIPE_CONFIG.MODEL_SELECTION.LOW; // 0: General model (faster)
      case 'high':
        return MEDIAPIPE_CONFIG.MODEL_SELECTION.HIGH; // 1: Landscape model (more accurate)
      default:
        return MEDIAPIPE_CONFIG.MODEL_SELECTION.LOW;
    }
  }

  /**
   * Change segmentation quality
   */
  async setQuality(quality: SegmentationQuality): Promise<void> {
    if (!this.model) return;

    this.quality = quality;
    this.model.setOptions({
      modelSelection: this.getModelType(quality),
    });
  }

  /**
   * Check if initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.model) {
      this.model.close();
      this.model = null;
    }
    this.isInitialized = false;
    this.lastMask = null;
  }
}
