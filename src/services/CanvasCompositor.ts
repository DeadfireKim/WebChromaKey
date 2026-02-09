import { BackgroundMode, CompositeOptions } from '@/types/compositor';
import { CANVAS_CONFIG } from '@/constants/config';

export class CanvasCompositor {
  private outputCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private options: CompositeOptions;

  // Reusable canvases for performance
  private sourceCanvas: HTMLCanvasElement | null = null;
  private blurCanvas: HTMLCanvasElement | null = null;
  private maskCanvas: HTMLCanvasElement | null = null;

  constructor(options?: Partial<CompositeOptions>) {
    this.options = {
      backgroundMode: 'replace',
      blurStrength: 50,
      edgeBlending: 0.1,
      maskTightness: 0.15, // Default 15% tightness
      ...options,
    };
  }

  /**
   * Set output canvas
   */
  setOutputCanvas(canvas: HTMLCanvasElement): void {
    this.outputCanvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!this.ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
  }

  /**
   * Set background image
   */
  setBackgroundImage(image: HTMLImageElement): void {
    this.backgroundImage = image;
  }

  /**
   * Update compositor options
   */
  setOptions(options: Partial<CompositeOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Compose frame with background
   */
  compose(frame: ImageData, mask?: ImageData): ImageData {
    if (!this.outputCanvas || !this.ctx) {
      throw new Error('Output canvas not initialized');
    }

    const { width, height } = frame;
    const output = new ImageData(width, height);

    // Debug logging
    console.log('[CanvasCompositor] Mode:', this.options.backgroundMode, 'Mask:', !!mask);

    if (this.options.backgroundMode === 'none' || !mask) {
      // No background replacement - return original frame
      output.data.set(frame.data);
      return output;
    }

    // Apply mask tightening first to shrink mask closer to person
    let processedMask = this.tightenMask(mask, this.options.maskTightness || 0);

    // Then apply edge feathering for smoother boundaries
    processedMask = this.featherMask(processedMask, this.options.edgeBlending || 0.1);

    // Handle blur mode
    if (this.options.backgroundMode === 'blur') {
      console.log('[CanvasCompositor] Applying blur, strength:', this.options.blurStrength);
      return this.composeWithBlur(frame, processedMask);
    }

    // Handle replace mode
    if (this.options.backgroundMode === 'replace' && this.backgroundImage) {
      this.drawBackground(width, height);
      const bgData = this.ctx.getImageData(0, 0, width, height);

      // Composite foreground with background using processed mask
      for (let i = 0; i < frame.data.length; i += 4) {
        const maskValue = processedMask.data[i] / 255; // 0-1, where 1 = foreground

        // Blend foreground and background based on mask
        output.data[i] = frame.data[i] * maskValue + bgData.data[i] * (1 - maskValue);
        output.data[i + 1] = frame.data[i + 1] * maskValue + bgData.data[i + 1] * (1 - maskValue);
        output.data[i + 2] = frame.data[i + 2] * maskValue + bgData.data[i + 2] * (1 - maskValue);
        output.data[i + 3] = 255; // Alpha
      }
    } else {
      // No background image - just return frame
      output.data.set(frame.data);
    }

    return output;
  }

  /**
   * Tighten mask by applying erosion to shrink it closer to person
   */
  private tightenMask(mask: ImageData, tightness: number): ImageData {
    if (tightness <= 0) return mask;

    const { width, height } = mask;

    // Apply threshold first
    const threshold = Math.round(tightness * 200); // Increased from 128 to 200 for stronger effect
    let current = new ImageData(width, height);

    for (let i = 0; i < mask.data.length; i += 4) {
      const value = mask.data[i];
      if (value < threshold) {
        current.data[i] = 0;
        current.data[i + 1] = 0;
        current.data[i + 2] = 0;
      } else {
        const boosted = Math.min(255, ((value - threshold) / (255 - threshold)) * 255);
        current.data[i] = boosted;
        current.data[i + 1] = boosted;
        current.data[i + 2] = boosted;
      }
      current.data[i + 3] = 255;
    }

    // Apply morphological erosion - shrink edges by checking neighbors
    // Number of erosion iterations based on tightness
    const iterations = Math.max(1, Math.round(tightness * 6)); // 0-3 iterations
    console.log('[tightenMask] Applying', iterations, 'erosion iterations');

    for (let iter = 0; iter < iterations; iter++) {
      const eroded = new ImageData(width, height);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const idx = (y * width + x) * 4;
          const centerValue = current.data[idx];

          // Check 4-neighbors (faster than 8-neighbors)
          const top = current.data[((y - 1) * width + x) * 4];
          const bottom = current.data[((y + 1) * width + x) * 4];
          const left = current.data[(y * width + (x - 1)) * 4];
          const right = current.data[(y * width + (x + 1)) * 4];

          // Erosion: take minimum of center and neighbors
          const minValue = Math.min(centerValue, top, bottom, left, right);

          eroded.data[idx] = minValue;
          eroded.data[idx + 1] = minValue;
          eroded.data[idx + 2] = minValue;
          eroded.data[idx + 3] = 255;
        }
      }

      // Handle edges (copy from current)
      for (let x = 0; x < width; x++) {
        // Top row
        const topIdx = x * 4;
        eroded.data[topIdx] = current.data[topIdx];
        eroded.data[topIdx + 1] = current.data[topIdx + 1];
        eroded.data[topIdx + 2] = current.data[topIdx + 2];
        eroded.data[topIdx + 3] = 255;

        // Bottom row
        const bottomIdx = ((height - 1) * width + x) * 4;
        eroded.data[bottomIdx] = current.data[bottomIdx];
        eroded.data[bottomIdx + 1] = current.data[bottomIdx + 1];
        eroded.data[bottomIdx + 2] = current.data[bottomIdx + 2];
        eroded.data[bottomIdx + 3] = 255;
      }
      for (let y = 0; y < height; y++) {
        // Left column
        const leftIdx = (y * width) * 4;
        eroded.data[leftIdx] = current.data[leftIdx];
        eroded.data[leftIdx + 1] = current.data[leftIdx + 1];
        eroded.data[leftIdx + 2] = current.data[leftIdx + 2];
        eroded.data[leftIdx + 3] = 255;

        // Right column
        const rightIdx = (y * width + (width - 1)) * 4;
        eroded.data[rightIdx] = current.data[rightIdx];
        eroded.data[rightIdx + 1] = current.data[rightIdx + 1];
        eroded.data[rightIdx + 2] = current.data[rightIdx + 2];
        eroded.data[rightIdx + 3] = 255;
      }

      current = eroded;
    }

    return current;
  }

  /**
   * Apply feathering to mask edges for smoother transitions
   */
  private featherMask(mask: ImageData, strength: number): ImageData {
    const { width, height } = mask;

    // Initialize mask canvas if needed
    if (!this.maskCanvas) {
      this.maskCanvas = document.createElement('canvas');
    }
    this.maskCanvas.width = width;
    this.maskCanvas.height = height;
    const maskCtx = this.maskCanvas.getContext('2d', { willReadFrequently: true })!;

    // Draw mask to canvas
    maskCtx.putImageData(mask, 0, 0);

    // Apply blur to soften edges (strength 0-1 maps to 0-5px blur)
    const blurAmount = Math.max(1, Math.round(strength * 10));
    maskCtx.filter = `blur(${blurAmount}px)`;
    maskCtx.drawImage(this.maskCanvas, 0, 0);
    maskCtx.filter = 'none';

    // Extract feathered mask
    return maskCtx.getImageData(0, 0, width, height);
  }

  /**
   * Compose with blur effect on background (optimized with canvas reuse)
   */
  private composeWithBlur(frame: ImageData, mask: ImageData): ImageData {
    console.log('[composeWithBlur] START - size:', frame.width, 'x', frame.height);

    if (!this.ctx) {
      throw new Error('Canvas context not initialized');
    }

    const { width, height } = frame;

    // Initialize reusable canvases if needed
    if (!this.sourceCanvas) {
      this.sourceCanvas = document.createElement('canvas');
    }
    if (!this.blurCanvas) {
      this.blurCanvas = document.createElement('canvas');
    }

    // Resize canvases if dimensions changed
    if (this.sourceCanvas.width !== width || this.sourceCanvas.height !== height) {
      this.sourceCanvas.width = width;
      this.sourceCanvas.height = height;
      this.blurCanvas.width = width;
      this.blurCanvas.height = height;
    }

    const sourceCtx = this.sourceCanvas.getContext('2d')!;
    const blurCtx = this.blurCanvas.getContext('2d', { willReadFrequently: true })!;

    // Draw original frame to source canvas
    sourceCtx.putImageData(frame, 0, 0);

    // Apply blur filter and draw to blur canvas
    const blurAmount = Math.max(1, Math.round((this.options.blurStrength || 50) / 5)); // 1-10px
    console.log('[composeWithBlur] Blur amount:', blurAmount, 'px');
    blurCtx.filter = `blur(${blurAmount}px)`;
    blurCtx.drawImage(this.sourceCanvas, 0, 0);
    blurCtx.filter = 'none';
    console.log('[composeWithBlur] Blur applied');

    // Get blurred frame
    const blurredFrame = blurCtx.getImageData(0, 0, width, height);

    // Composite: foreground (original) + background (blurred)
    const output = new ImageData(width, height);
    for (let i = 0; i < frame.data.length; i += 4) {
      const maskValue = mask.data[i] / 255; // 0-1, where 1 = foreground

      // foreground uses original frame, background uses blurred
      output.data[i] = frame.data[i] * maskValue + blurredFrame.data[i] * (1 - maskValue);
      output.data[i + 1] = frame.data[i + 1] * maskValue + blurredFrame.data[i + 1] * (1 - maskValue);
      output.data[i + 2] = frame.data[i + 2] * maskValue + blurredFrame.data[i + 2] * (1 - maskValue);
      output.data[i + 3] = 255; // Alpha
    }

    return output;
  }

  /**
   * Render composite to output canvas
   */
  render(composite: ImageData): void {
    if (!this.ctx || !this.outputCanvas) {
      throw new Error('Output canvas not initialized');
    }

    this.ctx.putImageData(composite, 0, 0);
  }

  /**
   * Draw background image to canvas
   */
  private drawBackground(width: number, height: number): void {
    if (!this.ctx || !this.backgroundImage) return;

    const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
    const canvasRatio = width / height;

    let drawWidth: number, drawHeight: number, offsetX = 0, offsetY = 0;

    // Cover mode - fill entire canvas
    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    }

    this.ctx.drawImage(
      this.backgroundImage,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );
  }

  /**
   * Clear canvas
   */
  clear(): void {
    if (!this.ctx || !this.outputCanvas) return;
    this.ctx.clearRect(0, 0, this.outputCanvas.width, this.outputCanvas.height);
  }

  /**
   * Get current background mode
   */
  getBackgroundMode(): BackgroundMode {
    return this.options.backgroundMode;
  }
}
