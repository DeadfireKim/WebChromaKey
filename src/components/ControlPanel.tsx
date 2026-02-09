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
    <div className="space-y-6">
      {/* Segmentation Toggle */}
      <div>
        <label className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">배경 제거</span>
          <button
            onClick={() => onToggleSegmentation(!isSegmentationActive)}
            disabled={disabled}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
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
        <p className="text-xs text-muted-foreground">
          AI 기반 배경 분리 기능 {isSegmentationActive ? '활성화' : '비활성화'}
        </p>
      </div>

      {/* Quality Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          세그멘테이션 품질
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['low', 'medium', 'high'] as SegmentationQuality[]).map((quality) => (
            <button
              key={quality}
              onClick={() => onQualityChange(quality)}
              disabled={disabled || !isSegmentationActive}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
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
        <p className="text-xs text-muted-foreground mt-2">
          {segmentationQuality === 'low' && '빠른 속도, 낮은 정확도'}
          {segmentationQuality === 'medium' && '균형잡힌 성능'}
          {segmentationQuality === 'high' && '높은 정확도, 느린 속도'}
        </p>
      </div>

      {/* Info */}
      {isSegmentationActive && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-xs text-muted-foreground">
            💡 MediaPipe Selfie Segmentation 사용 중
          </p>
        </div>
      )}
    </div>
  );
}
