'use client';

import { useState, useEffect, useRef } from 'react';
import { useCamera } from '@/hooks/useCamera';
import { CanvasCompositor } from '@/services/CanvasCompositor';
import CameraCapture from '@/components/CameraCapture';
import PreviewCanvas from '@/components/PreviewCanvas';

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

  const [fps, setFps] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<CanvasCompositor | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  // Initialize compositor
  useEffect(() => {
    compositorRef.current = new CanvasCompositor();

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  // Set output canvas when ref is ready
  useEffect(() => {
    if (canvasRef.current && compositorRef.current) {
      compositorRef.current.setOutputCanvas(canvasRef.current);
    }
  }, []);

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
  }, [isActive]);

  const startRenderLoop = () => {
    const render = () => {
      try {
        const frame = getCurrentFrame();
        if (frame && compositorRef.current) {
          // For now, just render the frame without segmentation
          const composite = compositorRef.current.compose(frame);
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

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Web Chroma Key</h1>
          <p className="text-muted-foreground">
            실시간 웹캠 배경 교체 기능
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
                {!isActive && (
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
              </div>
            </div>

            {/* Week 1 Status */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                Week 1: Core Infrastructure
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>CameraStreamManager</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>CanvasCompositor</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>PreviewCanvas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">○</span>
                  <span className="text-muted-foreground">Segmentation (Week 2)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
