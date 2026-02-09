'use client';

import { useRef, useState } from 'react';
import { BackgroundMode } from '@/types/compositor';

interface BackgroundUploadProps {
  backgroundImage: HTMLImageElement | null;
  backgroundMode: BackgroundMode;
  blurStrength?: number;
  edgeSmoothing?: number;
  maskTightness?: number;
  onUpload: (file: File) => Promise<void>;
  onModeChange: (mode: BackgroundMode) => void;
  onBlurStrengthChange?: (strength: number) => void;
  onEdgeSmoothingChange?: (smoothing: number) => void;
  onMaskTightnessChange?: (tightness: number) => void;
  disabled?: boolean;
}

export default function BackgroundUpload({
  backgroundImage,
  backgroundMode,
  blurStrength = 50,
  edgeSmoothing = 10,
  maskTightness = 15,
  onUpload,
  onModeChange,
  onBlurStrengthChange,
  onEdgeSmoothingChange,
  onMaskTightnessChange,
  disabled = false,
}: BackgroundUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (error) {
      console.error('Failed to upload background:', error);
      alert('배경 이미지 업로드에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Upload Button */}
      <div>
        <label className="block text-sm font-medium mb-2">
          배경 이미지
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={disabled || isUploading}
          className="hidden"
        />
        <button
          onClick={handleButtonClick}
          disabled={disabled || isUploading}
          className="w-full px-4 py-3 border-2 border-dashed border-border rounded-lg hover:border-primary hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              업로드 중...
            </span>
          ) : backgroundImage ? (
            <span className="flex items-center justify-center gap-2">
              ✓ 이미지 변경
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              📁 이미지 선택
            </span>
          )}
        </button>
      </div>

      {/* Preview */}
      {backgroundImage && (
        <div className="relative aspect-video rounded-lg overflow-hidden border border-border">
          <img
            src={backgroundImage.src}
            alt="Background preview"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Mode Selector */}
      <div>
        <label className="block text-sm font-medium mb-2">
          배경 모드
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['replace', 'blur', 'none'] as BackgroundMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              disabled={disabled}
              className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                backgroundMode === mode
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border hover:bg-muted'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {mode === 'replace' && '교체'}
              {mode === 'blur' && '블러'}
              {mode === 'none' && '없음'}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {backgroundMode === 'replace' && '배경을 이미지로 교체'}
          {backgroundMode === 'blur' && '배경을 블러 처리'}
          {backgroundMode === 'none' && '원본 영상 사용'}
        </p>
      </div>

      {/* Blur Strength Slider */}
      {backgroundMode === 'blur' && (
        <div>
          <label className="block text-sm font-medium mb-2">
            블러 강도: {blurStrength}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={blurStrength}
            onChange={(e) => onBlurStrengthChange?.(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>약함</span>
            <span>강함</span>
          </div>
        </div>
      )}

      {/* Edge Smoothing Slider */}
      {(backgroundMode === 'blur' || backgroundMode === 'replace') && (
        <div>
          <label className="block text-sm font-medium mb-2">
            경계선 부드럽기: {edgeSmoothing}%
          </label>
          <input
            type="range"
            min="0"
            max="50"
            value={edgeSmoothing}
            onChange={(e) => onEdgeSmoothingChange?.(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>선명</span>
            <span>부드러움</span>
          </div>
        </div>
      )}

      {/* Mask Tightness Slider */}
      {(backgroundMode === 'blur' || backgroundMode === 'replace') && (
        <div>
          <label className="block text-sm font-medium mb-2">
            마스크 조임: {maskTightness}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={maskTightness}
            onChange={(e) => onMaskTightnessChange?.(Number(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>느슨함</span>
            <span>강하게 조임</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            💡 높을수록 외곽선이 사람에게 바짝 붙음 (20-40% 추천)
          </p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-muted-foreground">
        <p>• 지원 형식: JPG, PNG, WebP</p>
        <p>• 최대 크기: 10MB</p>
      </div>
    </div>
  );
}
