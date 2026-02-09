'use client';

import { SegmentationQuality } from '@/types/segmentation';

interface ControlPanelProps {
  isSegmentationActive: boolean;
  segmentationQuality: SegmentationQuality;
  onToggleSegmentation: (active: boolean) => void;
  onQualityChange: (quality: SegmentationQuality) => void;
  disabled?: boolean;
}

export default function ControlPanel({
  isSegmentationActive,
  segmentationQuality,
  onToggleSegmentation,
  onQualityChange,
  disabled = false,
}: ControlPanelProps) {
  return (
    <div className="space-y-3">
      {/* Segmentation Toggle */}
      <div>
        <label className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium">배경 제거</span>
          <button
            onClick={() => onToggleSegmentation(!isSegmentationActive)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isSegmentationActive ? 'bg-primary' : 'bg-muted'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isSegmentationActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Quality Selector */}
      <div>
        <label className="block text-xs font-medium mb-1.5">품질</label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as SegmentationQuality[]).map((quality) => (
            <button
              key={quality}
              onClick={() => onQualityChange(quality)}
              disabled={disabled || !isSegmentationActive}
              className={`px-2 py-1.5 text-sm rounded-md border transition-colors ${
                segmentationQuality === quality
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              } ${
                disabled || !isSegmentationActive
                  ? 'opacity-50 cursor-not-allowed'
                  : 'cursor-pointer'
              }`}
            >
              {quality === 'low' && '낮음'}
              {quality === 'medium' && '중간'}
              {quality === 'high' && '높음'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
