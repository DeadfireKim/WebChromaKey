'use client';

import { useState, useEffect, useRef } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { CanvasCompositor } from '@/services/CanvasCompositor';
import { SegmentationEngine } from '@/services/SegmentationEngine';
import { SegmentationQuality } from '@/types/segmentation';
import { BackgroundMode } from '@/types/compositor';
import CameraCapture from '@/components/CameraCapture';
import ControlPanel from '@/components/ControlPanel';
import BackgroundUpload from '@/components/BackgroundUpload';

export default function ChromaKeyPage() {
  const {
    isActive,
    devices,
    selectedDeviceId,
    error,
    dimensions,
    startCamera,
    stopCamera,
    setSelectedDeviceId,
    getCurrentFrame,
  } = useCamera();

  // State
  const [fps, setFps] = useState(0);
  const [isSegmentationActive, setIsSegmentationActive] = useState(false);
  const [segmentationQuality, setSegmentationQuality] = useState<SegmentationQuality>('medium');
  const [backgroundMode, setBackgroundMode] = useState<BackgroundMode>('none');
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<CanvasCompositor | null>(null);
  const segmentationRef = useRef<SegmentationEngine | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize compositor and segmentation engine
  useEffect(() => {
    compositorRef.current = new CanvasCompositor();
    segmentationRef.current = new SegmentationEngine();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
      compositorRef.current = null;
      segmentationRef.current?.dispose();
    };
  }, []);

  // Set output canvas when ref is ready
  useEffect(() => {
    if (canvasRef.current && compositorRef.current) {
      compositorRef.current.setOutputCanvas(canvasRef.current);
    }
  }, []);

  // Initialize segmentation when activated
  useEffect(() => {
    if (isSegmentationActive && segmentationRef.current && !segmentationRef.current.isReady()) {
      initializeSegmentation();
    }
  }, [isSegmentationActive]);

  // Update compositor options
  useEffect(() => {
    if (compositorRef.current) {
      compositorRef.current.setOptions({ backgroundMode });
    }
  }, [backgroundMode]);

  // Update background image
  useEffect(() => {
    if (compositorRef.current && backgroundImage) {
      compositorRef.current.setBackgroundImage(backgroundImage);
    }
  }, [backgroundImage]);

  // Start/stop rendering loop
  useEffect(() => {
    if (isActive && canvasRef.current) {
      startRenderLoop();
    } else {
      stopRenderLoop();
    }

    return () => {
      stopRenderLoop();
    };
  }, [isActive, isSegmentationActive]);

  const initializeSegmentation = async () => {
    if (!segmentationRef.current) return;

    setIsInitializing(true);
    try {
      await segmentationRef.current.initialize(segmentationQuality);
      console.log('Segmentation initialized');
    } catch (error) {
      console.error('Failed to initialize segmentation:', error);
      alert('배경 제거 초기화에 실패했습니다. 페이지를 새로고침해주세요.');
      setIsSegmentationActive(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const startRenderLoop = () => {
    const render = async () => {
      try {
        const frame = getCurrentFrame();
        if (frame && compositorRef.current) {
          let mask: ImageData | undefined;

          // Get segmentation mask if active
          if (isSegmentationActive && segmentationRef.current?.isReady()) {
            try {
              const result = await segmentationRef.current.segment(frame);
              mask = result.mask;
            } catch (err) {
              console.error('Segmentation error:', err);
            }
          }

          // Compose with or without mask
          const composite = compositorRef.current.compose(frame, mask);
          compositorRef.current.render(composite);

          // Update FPS
          updateFPS();
        }
      } catch (err) {
        console.error('Render error:', err);
      }

      rafIdRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const stopRenderLoop = () => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  };

  const updateFPS = () => {
    const now = performance.now();
    frameCountRef.current++;

    if (now - lastFrameTimeRef.current >= 1000) {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
  };

  const handleToggleSegmentation = (active: boolean) => {
    setIsSegmentationActive(active);
  };

  const handleQualityChange = async (quality: SegmentationQuality) => {
    setSegmentationQuality(quality);
    if (segmentationRef.current?.isReady()) {
      await segmentationRef.current.setQuality(quality);
    }
  };

  const handleBackgroundUpload = async (file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setBackgroundImage(img);
          if (backgroundMode === 'none') {
            setBackgroundMode('replace');
          }
          resolve();
        };
        img.onerror = () => {
          reject(new Error('Failed to load image'));
        };
        img.src = e.target?.result as string;
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Web Chroma Key</h1>
          <p className="text-muted-foreground">
            실시간 웹캠 배경 교체 기능 - MediaPipe Selfie Segmentation
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Preview */}
          <div className="lg:col-span-2">
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">미리보기</h2>
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  className="w-full h-auto bg-black rounded-lg"
                />
                {fps > 0 && (
                  <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
                    FPS: {fps.toFixed(1)}
                  </div>
                )}
                {isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="text-white text-center">
                      <div className="animate-spin text-4xl mb-2">⏳</div>
                      <p className="text-lg">AI 모델 로딩 중...</p>
                    </div>
                  </div>
                )}
                {!isActive && !isInitializing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <p className="text-white text-lg">카메라를 시작해주세요</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Controls Sidebar */}
          <div className="space-y-6">
            {/* Camera Controls */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">카메라 설정</h2>
              <CameraCapture
                isActive={isActive}
                selectedDeviceId={selectedDeviceId}
                error={error}
                devices={devices}
                onStart={startCamera}
                onStop={stopCamera}
                onDeviceChange={setSelectedDeviceId}
              />
            </div>

            {/* Segmentation Controls */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">배경 제거</h2>
              <ControlPanel
                isSegmentationActive={isSegmentationActive}
                segmentationQuality={segmentationQuality}
                onToggleSegmentation={handleToggleSegmentation}
                onQualityChange={handleQualityChange}
                disabled={!isActive || isInitializing}
              />
            </div>

            {/* Background Upload */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">배경 이미지</h2>
              <BackgroundUpload
                backgroundImage={backgroundImage}
                backgroundMode={backgroundMode}
                onUpload={handleBackgroundUpload}
                onModeChange={setBackgroundMode}
                disabled={!isActive}
              />
            </div>

            {/* Info */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">정보</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">해상도:</span>
                  <span className="font-mono">
                    {dimensions.width} × {dimensions.height}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">FPS:</span>
                  <span className="font-mono">{fps.toFixed(1)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">상태:</span>
                  <span className={isActive ? 'text-green-500' : 'text-muted-foreground'}>
                    {isActive ? '실행 중' : '대기 중'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">배경 제거:</span>
                  <span className={isSegmentationActive ? 'text-green-500' : 'text-muted-foreground'}>
                    {isSegmentationActive ? 'ON' : 'OFF'}
                  </span>
                </div>
              </div>
            </div>

            {/* Week 2 Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Week 2: ML Integration
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>SegmentationEngine</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>MediaPipe 통합</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>실시간 마스크 생성</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>배경 교체 기능</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
