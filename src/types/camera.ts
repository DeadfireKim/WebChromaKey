export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface CameraStreamConstraints {
  deviceId?: string;
  width?: number;
  height?: number;
  frameRate?: number;
}

export interface CameraState {
  isActive: boolean;
  deviceId: string | null;
  devices: CameraDevice[];
  error: string | null;
}
