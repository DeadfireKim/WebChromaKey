'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { CameraDevice } from '@/types/camera';
import { CameraStreamManager } from '@/services/CameraStreamManager';

export function useCamera() {
  const [isActive, setIsActive] = useState(false);
  const [devices, setDevices] = useState<CameraDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 480 });

  const managerRef = useRef<CameraStreamManager | null>(null);

  // Initialize manager
  useEffect(() => {
    managerRef.current = new CameraStreamManager();

    // Load devices
    loadDevices();

    return () => {
      managerRef.current?.dispose();
    };
  }, []);

  const loadDevices = async () => {
    try {
      if (managerRef.current) {
        const deviceList = await managerRef.current.getDevices();
        setDevices(deviceList);
      }
    } catch (err) {
      console.error('Failed to load devices:', err);
    }
  };

  const startCamera = useCallback(async (deviceId?: string) => {
    if (!managerRef.current) return;

    try {
      setError(null);
      await managerRef.current.startStream(deviceId);
      setIsActive(true);
      setDimensions(managerRef.current.getDimensions());

      // Reload devices to get labels
      await loadDevices();
    } catch (err: any) {
      setError(err.message || '카메라 시작에 실패했습니다.');
      setIsActive(false);
      throw err;
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (!managerRef.current) return;

    managerRef.current.stopStream();
    setIsActive(false);
    setError(null);
  }, []);

  const getCurrentFrame = useCallback(() => {
    if (!managerRef.current) return null;
    try {
      return managerRef.current.getCurrentFrame();
    } catch (err) {
      console.error('Failed to get frame:', err);
      return null;
    }
  }, []);

  return {
    isActive,
    devices,
    selectedDeviceId,
    error,
    dimensions,
    manager: managerRef.current,
    startCamera,
    stopCamera,
    setSelectedDeviceId,
    getCurrentFrame,
  };
}
