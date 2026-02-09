'use client';

import { useState, useEffect } from 'react';
import { CameraDevice } from '@/types/camera';

interface CameraCaptureProps {
  isActive: boolean;
  selectedDeviceId: string | null;
  error: string | null;
  devices: CameraDevice[];
  onStart: (deviceId?: string) => Promise<void>;
  onStop: () => void;
  onDeviceChange: (deviceId: string) => void;
}

export default function CameraCapture({
  isActive,
  selectedDeviceId,
  error,
  devices,
  onStart,
  onStop,
  onDeviceChange,
}: CameraCaptureProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (isActive) {
      onStop();
    } else {
      setIsLoading(true);
      try {
        await onStart(selectedDeviceId || undefined);
      } catch (err) {
        console.error('Failed to start camera:', err);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          카메라 선택
        </label>
        <select
          value={selectedDeviceId || ''}
          onChange={(e) => onDeviceChange(e.target.value)}
          disabled={isActive || devices.length === 0}
          className="w-full px-3 py-2 border border-border rounded-md bg-background disabled:opacity-50"
        >
          <option value="">기본 카메라</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isActive
            ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        } disabled:opacity-50`}
      >
        {isLoading ? '시작 중...' : isActive ? '카메라 중지' : '카메라 시작'}
      </button>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {isActive && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>카메라 실행 중</span>
        </div>
      )}
    </div>
  );
}
