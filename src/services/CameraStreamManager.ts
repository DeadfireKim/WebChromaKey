import { CameraDevice, CameraStreamConstraints } from '@/types/camera';
import { ChromaKeyError } from '@/utils/errors';
import { CAMERA_CONFIG } from '@/constants/config';

export class CameraStreamManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    // Create hidden video element for stream capture
    this.videoElement = document.createElement('video');
    this.videoElement.autoplay = true;
    this.videoElement.playsInline = true;

    // Create canvas for frame extraction
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /**
   * Get list of available camera devices
   */
  async getDevices(): Promise<CameraDevice[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter(device => device.kind === 'videoinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Camera ${device.deviceId.slice(0, 5)}`,
        }));
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  }

  /**
   * Start camera stream
   */
  async startStream(deviceId?: string): Promise<void> {
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: CAMERA_CONFIG.DEFAULT_WIDTH },
          height: { ideal: CAMERA_CONFIG.DEFAULT_HEIGHT },
          frameRate: { ideal: CAMERA_CONFIG.DEFAULT_FRAME_RATE },
        },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.videoElement.play();
          resolve();
        };
      });

      // Set canvas size to match video
      this.canvas.width = this.videoElement.videoWidth || CAMERA_CONFIG.DEFAULT_WIDTH;
      this.canvas.height = this.videoElement.videoHeight || CAMERA_CONFIG.DEFAULT_HEIGHT;

    } catch (error: any) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw ChromaKeyError.cameraAccessDenied(error);
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw ChromaKeyError.cameraNotFound(error);
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw ChromaKeyError.cameraInUse(error);
      }
      throw error;
    }
  }

  /**
   * Stop camera stream
   */
  stopStream(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Get current frame as ImageData
   */
  getCurrentFrame(): ImageData {
    if (!this.stream || !this.isActive()) {
      throw new Error('Camera stream is not active');
    }

    // Draw current video frame to canvas
    this.ctx.drawImage(
      this.videoElement,
      0,
      0,
      this.canvas.width,
      this.canvas.height
    );

    // Get image data
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Check if stream is active
   */
  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  /**
   * Get current video dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Get video element for direct access (if needed)
   */
  getVideoElement(): HTMLVideoElement {
    return this.videoElement;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    this.stopStream();
  }
}
