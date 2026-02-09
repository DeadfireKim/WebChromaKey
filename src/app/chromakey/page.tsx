'use client';

import { useState, useEffect, useRef } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { CanvasCompositor } from '@/services/CanvasCompositor';
import { SegmentationEngine } from '@/services/SegmentationEngine';
import { SegmentationQuality } from '@/types/segmentation';
import { BackgroundMode } from '@/types/compositor';
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
  const [blurStrength, setBlurStrength] = useState(50);
  const [edgeSmoothing, setEdgeSmoothing] = useState(10); // 0-100, maps to 0-1 edgeBlending
  const [maskTightness, setMaskTightness] = useState(15); // 0-50, maps to 0-0.5 maskTightness
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
      compositorRef.current.setOptions({
        backgroundMode,
        blurStrength,
        edgeBlending: edgeSmoothing / 100, // Convert 0-100 to 0-1
        maskTightness: maskTightness / 100 // Convert 0-50 to 0-0.5
      });
    }
  }, [backgroundMode, blurStrength, edgeSmoothing, maskTightness]);

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

          // Debug logging
          console.log('[RenderLoop] isSegmentationActive:', isSegmentationActive,
                      'isReady:', segmentationRef.current?.isReady());

          // Get segmentation mask if active
          if (isSegmentationActive && segmentationRef.current?.isReady()) {
            try {
              console.log('[RenderLoop] Calling segment...');
              const result = await segmentationRef.current.segment(frame);
              mask = result.mask;
              console.log('[RenderLoop] Mask received:', !!mask);
            } catch (err) {
              console.error('[RenderLoop] Segmentation error:', err);
            }
          } else {
            console.log('[RenderLoop] Segmentation NOT active or NOT ready');
          }

          // Compose with or without mask
          const composite = compositorRef.current.compose(frame, mask);
          compositorRef.current.render(composite);

          // Update FPS
          updateFPS();
        }
      } catch (err) {
        console.error('[RenderLoop] Render error:', err);
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
    console.log('[handleToggleSegmentation] Toggling:', active, 'isActive:', isActive, 'isInitializing:', isInitializing);
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
              {/* Header with Camera Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold">미리보기</h2>

                {/* Camera Controls - Inline */}
                <div className="flex items-center gap-3">
                  {/* Camera Select */}
                  <select
                    value={selectedDeviceId || ''}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    disabled={isActive || devices.length === 0}
                    className="px-3 py-2 text-sm border border-border rounded-md bg-background disabled:opacity-50 min-w-[180px]"
                  >
                    <option value="">기본 카메라</option>
                    {devices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label}
                      </option>
                    ))}
                  </select>

                  {/* Start/Stop Button */}
                  <button
                    onClick={async () => {
                      if (isActive) {
                        stopCamera();
                      } else {
                        await startCamera(selectedDeviceId || undefined);
                      }
                    }}
                    className={`px-4 py-2 text-sm rounded-md font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        : 'bg-primary text-primary-foreground hover:bg-primary/90'
                    }`}
                  >
                    {isActive ? '중지' : '시작'}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive rounded-md">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

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

          {/* Controls Sidebar - Scrollable */}
          <div className="space-y-6 max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
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
                blurStrength={blurStrength}
                edgeSmoothing={edgeSmoothing}
                maskTightness={maskTightness}
                onUpload={handleBackgroundUpload}
                onModeChange={setBackgroundMode}
                onBlurStrengthChange={setBlurStrength}
                onEdgeSmoothingChange={setEdgeSmoothing}
                onMaskTightnessChange={setMaskTightness}
                disabled={!isActive}
              />
            </div>

            {/* Info - Compact */}
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-1">해상도</div>
                  <div className="font-mono text-sm">
                    {dimensions.width}×{dimensions.height}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">FPS</div>
                  <div className="font-mono text-sm">{fps.toFixed(1)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">카메라</div>
                  <div className={`text-sm ${isActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {isActive ? '✓ 실행' : '대기'}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground mb-1">배경 제거</div>
                  <div className={`text-sm ${isSegmentationActive ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {isSegmentationActive ? '✓ ON' : 'OFF'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
