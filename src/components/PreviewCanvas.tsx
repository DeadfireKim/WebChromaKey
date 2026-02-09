'use client';

import { useEffect, useRef } from 'react';
import { CANVAS_CONFIG } from '@/constants/config';

interface PreviewCanvasProps {
  width?: number;
  height?: number;
  fps?: number;
  className?: string;
}

export default function PreviewCanvas({
  width = CANVAS_CONFIG.DEFAULT_WIDTH,
  height = CANVAS_CONFIG.DEFAULT_HEIGHT,
  fps = 0,
  className = '',
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="w-full h-auto bg-black rounded-lg"
      />
      {fps > 0 && (
        <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded text-sm font-mono">
          FPS: {fps.toFixed(1)}
        </div>
      )}
    </div>
  );
}

// Export ref type for parent components
export type PreviewCanvasRef = HTMLCanvasElement;
