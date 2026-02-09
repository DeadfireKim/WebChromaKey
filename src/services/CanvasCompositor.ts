import { BackgroundMode, CompositeOptions } from '@/types/compositor';
import { CANVAS_CONFIG } from '@/constants/config';

export class CanvasCompositor {
  private outputCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private options: CompositeOptions;

  constructor(options?: Partial<CompositeOptions>) {
    this.options = {
      backgroundMode: 'replace',
      blurStrength: 50,
      edgeBlending: 0.1,
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

    if (this.options.backgroundMode === 'none' || !mask) {
      // No background replacement - return original frame
      output.data.set(frame.data);
      return output;
    }

    // Handle blur mode
    if (this.options.backgroundMode === 'blur') {
      return this.composeWithBlur(frame, mask);
    }

    // Handle replace mode
    if (this.options.backgroundMode === 'replace' && this.backgroundImage) {
      this.drawBackground(width, height);
      const bgData = this.ctx.getImageData(0, 0, width, height);

      // Composite foreground with background using mask
      for (let i = 0; i < frame.data.length; i += 4) {
        const maskValue = mask.data[i] / 255; // 0-1, where 1 = foreground

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
   * Compose with blur effect on background
   */
  private composeWithBlur(frame: ImageData, mask: ImageData): ImageData {
    if (!this.ctx) {
      throw new Error('Canvas context not initialized');
    }

    const { width, height } = frame;

    // Create temporary canvas for blur
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true })!;

    // Draw original frame
    tempCtx.putImageData(frame, 0, 0);

    // Apply blur filter to entire canvas
    const blurAmount = Math.round((this.options.blurStrength || 50) / 5); // 0-10px
    tempCtx.filter = `blur(${blurAmount}px)`;
    tempCtx.drawImage(tempCanvas, 0, 0);
    tempCtx.filter = 'none';

    // Get blurred frame
    const blurredFrame = tempCtx.getImageData(0, 0, width, height);

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
