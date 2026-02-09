# Design: 웹 크로마키 기능 (Web Chroma Key)

> **Plan 문서 참조**: `docs/01-plan/features/web-chromakey.plan.md`

## 1. Architecture Design

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                       │
│                    (app/chromakey/page.tsx)                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   ChromaKeyApp Component                        │
│  ┌───────────────────┐  ┌────────────────────────────────┐    │
│  │  State Management │  │      Event Handlers            │    │
│  │  (useState/       │  │  - onCameraStart               │    │
│  │   useReducer)     │  │  - onBackgroundUpload          │    │
│  └───────────────────┘  │  - onSettingsChange            │    │
│                         └────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
            ↓                    ↓                    ↓
┌───────────────────┐  ┌──────────────────┐  ┌─────────────────┐
│  CameraCapture    │  │ BackgroundUpload │  │  ControlPanel   │
│  Component        │  │ Component        │  │  Component      │
└───────────────────┘  └──────────────────┘  └─────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   VideoProcessor Service                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Camera      │  │ Segmentation │  │  Canvas              │ │
│  │  Stream      │→ │ Engine       │→ │  Compositor          │ │
│  │  Manager     │  │ (MediaPipe)  │  │  (Background Merge)  │ │
│  └──────────────┘  └──────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Canvas Output Display                      │
│              (Rendered at 60fps via RAF loop)                   │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Layer Architecture

#### Presentation Layer (React Components)
- **ChromaKeyApp**: 최상위 컨테이너 컴포넌트
- **CameraCapture**: 웹캠 제어 UI
- **BackgroundUpload**: 배경 이미지 업로드 UI
- **ControlPanel**: 설정 컨트롤 UI
- **PreviewCanvas**: 실시간 미리보기 캔버스

#### Business Logic Layer (Services)
- **VideoProcessor**: 비디오 처리 파이프라인 총괄
- **CameraStreamManager**: 웹캠 스트림 관리
- **SegmentationEngine**: ML 세그멘테이션 처리
- **CanvasCompositor**: 이미지 합성 및 렌더링

#### Data Layer (State & Storage)
- **AppState**: 전역 상태 관리 (React Context/Zustand)
- **LocalStorage**: 사용자 설정 저장
- **IndexedDB**: 배경 이미지 캐싱 (선택)

### 1.3 Data Flow Diagram

```
[User Action] → [UI Component] → [State Update]
                                       ↓
                            [VideoProcessor Service]
                                       ↓
                  ┌────────────────────┼────────────────────┐
                  ↓                    ↓                    ↓
        [CameraStreamManager]  [SegmentationEngine]  [CanvasCompositor]
                  ↓                    ↓                    ↓
           [MediaStream]        [Mask Data]         [Composite Image]
                  ↓                    ↓                    ↓
                  └────────────────────┼────────────────────┘
                                       ↓
                             [Canvas Element (Output)]
                                       ↓
                              [User sees result]
```

## 2. Component Design

### 2.1 Component Tree

```
App
└── ChromaKeyPage (app/chromakey/page.tsx)
    └── ChromaKeyApp (components/ChromaKeyApp.tsx)
        ├── Header (components/Header.tsx)
        ├── MainContent
        │   ├── PreviewCanvas (components/PreviewCanvas.tsx)
        │   └── CameraStatus (components/CameraStatus.tsx)
        ├── Sidebar
        │   ├── CameraCapture (components/CameraCapture.tsx)
        │   ├── BackgroundUpload (components/BackgroundUpload.tsx)
        │   └── ControlPanel (components/ControlPanel.tsx)
        │       ├── EffectToggle
        │       ├── QualitySlider
        │       └── BlurSlider
        └── Footer (components/Footer.tsx)
            ├── SnapshotButton
            └── RecordButton (선택)
```

### 2.2 Component Specifications

#### 2.2.1 ChromaKeyApp (Container)

**파일**: `src/components/ChromaKeyApp.tsx`

**책임**:
- 전역 상태 관리
- VideoProcessor 생명주기 관리
- 자식 컴포넌트 간 통신 조율

**Props**: 없음 (최상위 컨테이너)

**State**:
```typescript
interface ChromaKeyState {
  // Camera
  isCameraActive: boolean;
  selectedDeviceId: string | null;
  cameraError: string | null;

  // Background
  backgroundImage: HTMLImageElement | null;
  backgroundMode: 'replace' | 'blur' | 'none';

  // Segmentation
  isSegmentationActive: boolean;
  segmentationQuality: 'low' | 'medium' | 'high';

  // Performance
  fps: number;
  isProcessing: boolean;
}
```

**Methods**:
```typescript
- handleCameraStart(deviceId?: string): Promise<void>
- handleCameraStop(): void
- handleBackgroundUpload(file: File): Promise<void>
- handleSettingsChange(settings: Partial<Settings>): void
- handleSnapshot(): void
- handleRecordStart(): void (선택)
- handleRecordStop(): void (선택)
```

**Lifecycle**:
```typescript
useEffect(() => {
  // VideoProcessor 초기화
  const processor = new VideoProcessor({
    onFrameProcessed: updateFPS,
    onError: handleError
  });

  return () => {
    // 리소스 정리
    processor.dispose();
  };
}, []);
```

---

#### 2.2.2 CameraCapture

**파일**: `src/components/CameraCapture.tsx`

**책임**:
- 카메라 목록 표시
- 카메라 선택 UI
- 시작/중지 버튼

**Props**:
```typescript
interface CameraCaptureProps {
  isActive: boolean;
  selectedDeviceId: string | null;
  error: string | null;
  onStart: (deviceId?: string) => Promise<void>;
  onStop: () => void;
}
```

**UI Structure**:
```tsx
<div className="camera-capture">
  <Select>
    {/* 카메라 목록 */}
  </Select>
  <Button onClick={isActive ? onStop : onStart}>
    {isActive ? '중지' : '시작'}
  </Button>
  {error && <Alert>{error}</Alert>}
</div>
```

---

#### 2.2.3 BackgroundUpload

**파일**: `src/components/BackgroundUpload.tsx`

**책임**:
- 배경 이미지 업로드
- 미리보기 썸네일
- 배경 모드 선택 (replace/blur/none)

**Props**:
```typescript
interface BackgroundUploadProps {
  backgroundImage: HTMLImageElement | null;
  backgroundMode: 'replace' | 'blur' | 'none';
  onUpload: (file: File) => Promise<void>;
  onModeChange: (mode: 'replace' | 'blur' | 'none') => void;
}
```

**UI Structure**:
```tsx
<div className="background-upload">
  <input type="file" accept="image/*" onChange={handleFileChange} />
  {backgroundImage && (
    <img src={backgroundImage.src} alt="Preview" />
  )}
  <RadioGroup value={backgroundMode} onChange={onModeChange}>
    <Radio value="replace">Replace</Radio>
    <Radio value="blur">Blur</Radio>
    <Radio value="none">None</Radio>
  </RadioGroup>
</div>
```

---

#### 2.2.4 ControlPanel

**파일**: `src/components/ControlPanel.tsx`

**책임**:
- 세그멘테이션 품질 조절
- 배경 블러 강도 조절
- 효과 on/off 토글

**Props**:
```typescript
interface ControlPanelProps {
  isSegmentationActive: boolean;
  segmentationQuality: 'low' | 'medium' | 'high';
  blurStrength: number;
  onToggleSegmentation: (active: boolean) => void;
  onQualityChange: (quality: 'low' | 'medium' | 'high') => void;
  onBlurStrengthChange: (strength: number) => void;
}
```

**UI Structure**:
```tsx
<div className="control-panel">
  <Switch checked={isSegmentationActive} onChange={onToggleSegmentation}>
    Enable Effect
  </Switch>
  <Slider
    label="Quality"
    value={segmentationQuality}
    options={['low', 'medium', 'high']}
    onChange={onQualityChange}
  />
  <Slider
    label="Blur Strength"
    value={blurStrength}
    min={0}
    max={100}
    onChange={onBlurStrengthChange}
  />
</div>
```

---

#### 2.2.5 PreviewCanvas

**파일**: `src/components/PreviewCanvas.tsx`

**책임**:
- Canvas 엘리먼트 렌더링
- FPS 표시
- VideoProcessor 연결

**Props**:
```typescript
interface PreviewCanvasProps {
  videoProcessor: VideoProcessor;
  fps: number;
  width?: number;
  height?: number;
}
```

**Implementation**:
```tsx
const PreviewCanvas: React.FC<PreviewCanvasProps> = ({
  videoProcessor,
  fps,
  width = 640,
  height = 480
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      videoProcessor.setOutputCanvas(canvasRef.current);
    }
  }, [videoProcessor]);

  return (
    <div className="preview-canvas">
      <canvas ref={canvasRef} width={width} height={height} />
      <div className="fps-counter">FPS: {fps.toFixed(1)}</div>
    </div>
  );
};
```

---

## 3. Service Design

### 3.1 VideoProcessor Service

**파일**: `src/services/VideoProcessor.ts`

**책임**:
- 전체 비디오 처리 파이프라인 조율
- RAF 루프 관리
- 성능 모니터링

**Interface**:
```typescript
interface VideoProcessorConfig {
  targetFPS?: number; // default: 60
  segmentationModel?: 'mediapipe' | 'bodyPix'; // default: 'mediapipe'
  onFrameProcessed?: (fps: number) => void;
  onError?: (error: Error) => void;
}

class VideoProcessor {
  private cameraManager: CameraStreamManager;
  private segmentationEngine: SegmentationEngine;
  private compositor: CanvasCompositor;

  private rafId: number | null = null;
  private lastFrameTime: number = 0;
  private fps: number = 0;

  constructor(config: VideoProcessorConfig);

  // Public Methods
  async initialize(): Promise<void>;
  async startCamera(deviceId?: string): Promise<void>;
  stopCamera(): void;
  setBackgroundImage(image: HTMLImageElement): void;
  setSegmentationActive(active: boolean): void;
  setSegmentationQuality(quality: 'low' | 'medium' | 'high'): void;
  setOutputCanvas(canvas: HTMLCanvasElement): void;
  captureSnapshot(): Blob;
  dispose(): void;

  // Private Methods
  private processFrame(): void;
  private calculateFPS(): number;
  private startRenderLoop(): void;
  private stopRenderLoop(): void;
}
```

**Implementation Flow**:
```typescript
class VideoProcessor {
  private async processFrame() {
    if (!this.isActive) return;

    try {
      // 1. Get current video frame
      const frame = this.cameraManager.getCurrentFrame();

      // 2. Run segmentation
      const mask = await this.segmentationEngine.segment(frame);

      // 3. Composite with background
      const composite = this.compositor.compose(frame, mask, this.backgroundImage);

      // 4. Render to output canvas
      this.compositor.render(composite);

      // 5. Update FPS
      this.fps = this.calculateFPS();
      this.config.onFrameProcessed?.(this.fps);

    } catch (error) {
      this.config.onError?.(error);
    }

    // 6. Schedule next frame
    this.rafId = requestAnimationFrame(() => this.processFrame());
  }
}
```

---

### 3.2 CameraStreamManager Service

**파일**: `src/services/CameraStreamManager.ts`

**책임**:
- getUserMedia 호출 및 스트림 관리
- 카메라 목록 조회
- 비디오 엘리먼트 관리

**Interface**:
```typescript
interface CameraDevice {
  deviceId: string;
  label: string;
}

class CameraStreamManager {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement;
  private canvasContext: CanvasRenderingContext2D;

  constructor();

  // Public Methods
  async getDevices(): Promise<CameraDevice[]>;
  async startStream(deviceId?: string, constraints?: MediaStreamConstraints): Promise<void>;
  stopStream(): void;
  getCurrentFrame(): ImageData;
  isActive(): boolean;

  // Private Methods
  private createVideoElement(): HTMLVideoElement;
  private captureFrameToCanvas(): ImageData;
}
```

**Implementation**:
```typescript
class CameraStreamManager {
  async startStream(deviceId?: string): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 60 }
      },
      audio: false
    };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();
    } catch (error) {
      throw new Error(`Camera access failed: ${error.message}`);
    }
  }

  getCurrentFrame(): ImageData {
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(this.videoElement, 0, 0);

    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }
}
```

---

### 3.3 SegmentationEngine Service

**파일**: `src/services/SegmentationEngine.ts`

**책임**:
- MediaPipe 모델 로딩 및 초기화
- 프레임 세그멘테이션 실행
- 마스크 데이터 생성

**Interface**:
```typescript
import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

type SegmentationQuality = 'low' | 'medium' | 'high';

interface SegmentationResult {
  mask: ImageData;
  width: number;
  height: number;
}

class SegmentationEngine {
  private model: SelfieSegmentation | null = null;
  private quality: SegmentationQuality = 'medium';
  private isInitialized: boolean = false;

  constructor();

  // Public Methods
  async initialize(quality?: SegmentationQuality): Promise<void>;
  async segment(frame: ImageData): Promise<SegmentationResult>;
  setQuality(quality: SegmentationQuality): void;
  dispose(): void;

  // Private Methods
  private getModelType(quality: SegmentationQuality): 0 | 1;
  private processSegmentation(results: any): ImageData;
}
```

**Implementation**:
```typescript
class SegmentationEngine {
  async initialize(quality: SegmentationQuality = 'medium'): Promise<void> {
    this.quality = quality;

    this.model = new SelfieSegmentation({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
      }
    });

    this.model.setOptions({
      modelSelection: this.getModelType(quality),
      selfieMode: true
    });

    this.model.onResults((results) => {
      // Results handled in segment() method
    });

    await this.model.initialize();
    this.isInitialized = true;
  }

  async segment(frame: ImageData): Promise<SegmentationResult> {
    if (!this.isInitialized || !this.model) {
      throw new Error('SegmentationEngine not initialized');
    }

    // Create temporary canvas for MediaPipe input
    const canvas = document.createElement('canvas');
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(frame, 0, 0);

    // Run segmentation
    await this.model.send({ image: canvas });

    // Return mask (handled via onResults callback)
    return {
      mask: this.lastMask!,
      width: frame.width,
      height: frame.height
    };
  }

  private getModelType(quality: SegmentationQuality): 0 | 1 {
    // 0: General model (faster)
    // 1: Landscape model (more accurate)
    return quality === 'high' ? 1 : 0;
  }
}
```

---

### 3.4 CanvasCompositor Service

**파일**: `src/services/CanvasCompositor.ts`

**책임**:
- 배경 이미지 전처리
- 마스크 기반 합성
- Canvas 렌더링 최적화

**Interface**:
```typescript
interface CompositeOptions {
  backgroundMode: 'replace' | 'blur' | 'none';
  blurStrength?: number;
  edgeBlending?: number; // 0-1, feathering amount
}

class CanvasCompositor {
  private outputCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private backgroundImage: HTMLImageElement | null = null;
  private options: CompositeOptions;

  constructor(options?: Partial<CompositeOptions>);

  // Public Methods
  setOutputCanvas(canvas: HTMLCanvasElement): void;
  setBackgroundImage(image: HTMLImageElement): void;
  setOptions(options: Partial<CompositeOptions>): void;
  compose(frame: ImageData, mask: ImageData): ImageData;
  render(composite: ImageData): void;

  // Private Methods
  private applyMask(frame: ImageData, mask: ImageData): ImageData;
  private blendEdges(imageData: ImageData, mask: ImageData, amount: number): ImageData;
  private drawBackground(): void;
  private scaleBackground(mode: 'cover' | 'contain' | 'stretch'): void;
}
```

**Implementation**:
```typescript
class CanvasCompositor {
  compose(frame: ImageData, mask: ImageData): ImageData {
    const { width, height } = frame;
    const output = new ImageData(width, height);

    // Draw background first
    this.drawBackground();
    const bgData = this.ctx!.getImageData(0, 0, width, height);

    // Composite foreground with background using mask
    for (let i = 0; i < frame.data.length; i += 4) {
      const maskValue = mask.data[i] / 255; // 0-1

      // Blend foreground and background based on mask
      output.data[i] = frame.data[i] * maskValue + bgData.data[i] * (1 - maskValue);
      output.data[i + 1] = frame.data[i + 1] * maskValue + bgData.data[i + 1] * (1 - maskValue);
      output.data[i + 2] = frame.data[i + 2] * maskValue + bgData.data[i + 2] * (1 - maskValue);
      output.data[i + 3] = 255; // Alpha
    }

    // Apply edge blending if enabled
    if (this.options.edgeBlending) {
      return this.blendEdges(output, mask, this.options.edgeBlending);
    }

    return output;
  }

  private drawBackground(): void {
    if (!this.ctx || !this.backgroundImage) return;

    const { width, height } = this.outputCanvas!;
    const imgRatio = this.backgroundImage.width / this.backgroundImage.height;
    const canvasRatio = width / height;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    // Cover mode (fill entire canvas)
    if (imgRatio > canvasRatio) {
      drawHeight = height;
      drawWidth = height * imgRatio;
      offsetX = (width - drawWidth) / 2;
    } else {
      drawWidth = width;
      drawHeight = width / imgRatio;
      offsetY = (height - drawHeight) / 2;
    }

    this.ctx.drawImage(
      this.backgroundImage,
      offsetX, offsetY,
      drawWidth, drawHeight
    );
  }

  private blendEdges(imageData: ImageData, mask: ImageData, amount: number): ImageData {
    // Morphological operations for edge smoothing
    const kernel = this.createGaussianKernel(amount * 10);
    return this.applyConvolution(imageData, mask, kernel);
  }
}
```

---

## 4. State Management

### 4.1 Global State Structure

**파일**: `src/store/chromakeyStore.ts` (using Zustand)

```typescript
interface ChromaKeyStore {
  // Camera State
  camera: {
    isActive: boolean;
    deviceId: string | null;
    devices: CameraDevice[];
    error: string | null;
  };

  // Background State
  background: {
    image: HTMLImageElement | null;
    mode: 'replace' | 'blur' | 'none';
  };

  // Segmentation State
  segmentation: {
    isActive: boolean;
    quality: 'low' | 'medium' | 'high';
    blurStrength: number;
  };

  // Performance State
  performance: {
    fps: number;
    isProcessing: boolean;
  };

  // Actions
  actions: {
    startCamera: (deviceId?: string) => Promise<void>;
    stopCamera: () => void;
    setBackgroundImage: (image: HTMLImageElement) => void;
    setBackgroundMode: (mode: 'replace' | 'blur' | 'none') => void;
    toggleSegmentation: (active: boolean) => void;
    setSegmentationQuality: (quality: 'low' | 'medium' | 'high') => void;
    setBlurStrength: (strength: number) => void;
    updateFPS: (fps: number) => void;
  };
}

const useChromaKeyStore = create<ChromaKeyStore>((set, get) => ({
  camera: {
    isActive: false,
    deviceId: null,
    devices: [],
    error: null
  },

  background: {
    image: null,
    mode: 'replace'
  },

  segmentation: {
    isActive: true,
    quality: 'medium',
    blurStrength: 50
  },

  performance: {
    fps: 0,
    isProcessing: false
  },

  actions: {
    startCamera: async (deviceId) => {
      set({ camera: { ...get().camera, isProcessing: true } });
      // Implementation...
    },
    // ... other actions
  }
}));
```

### 4.2 Local Storage Persistence

**파일**: `src/utils/storage.ts`

```typescript
interface StoredSettings {
  lastUsedDeviceId: string | null;
  segmentationQuality: 'low' | 'medium' | 'high';
  blurStrength: number;
  backgroundMode: 'replace' | 'blur' | 'none';
}

class SettingsStorage {
  private static STORAGE_KEY = 'chromakey-settings';

  static save(settings: Partial<StoredSettings>): void {
    const current = this.load();
    const updated = { ...current, ...settings };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
  }

  static load(): StoredSettings {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return this.getDefaults();
    return JSON.parse(stored);
  }

  static getDefaults(): StoredSettings {
    return {
      lastUsedDeviceId: null,
      segmentationQuality: 'medium',
      blurStrength: 50,
      backgroundMode: 'replace'
    };
  }
}
```

---

## 5. API Design (Internal Interfaces)

### 5.1 VideoProcessor API

```typescript
// Initialize
const processor = new VideoProcessor({
  targetFPS: 60,
  segmentationModel: 'mediapipe',
  onFrameProcessed: (fps) => console.log(`FPS: ${fps}`),
  onError: (error) => console.error(error)
});

await processor.initialize();

// Start camera
await processor.startCamera('device-id-123');

// Set background
const img = new Image();
img.src = '/backgrounds/office.jpg';
await img.decode();
processor.setBackgroundImage(img);

// Configure segmentation
processor.setSegmentationActive(true);
processor.setSegmentationQuality('high');

// Attach output canvas
const canvas = document.getElementById('output') as HTMLCanvasElement;
processor.setOutputCanvas(canvas);

// Capture snapshot
const blob = processor.captureSnapshot();
const url = URL.createObjectURL(blob);

// Cleanup
processor.dispose();
```

### 5.2 Error Handling

```typescript
enum ChromaKeyError {
  CAMERA_ACCESS_DENIED = 'CAMERA_ACCESS_DENIED',
  CAMERA_NOT_FOUND = 'CAMERA_NOT_FOUND',
  SEGMENTATION_MODEL_LOAD_FAILED = 'SEGMENTATION_MODEL_LOAD_FAILED',
  SEGMENTATION_FAILED = 'SEGMENTATION_FAILED',
  INVALID_BACKGROUND_IMAGE = 'INVALID_BACKGROUND_IMAGE',
  PERFORMANCE_DEGRADED = 'PERFORMANCE_DEGRADED'
}

class ChromaKeyException extends Error {
  constructor(
    public code: ChromaKeyError,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ChromaKeyException';
  }
}

// Usage
try {
  await processor.startCamera();
} catch (error) {
  if (error instanceof ChromaKeyException) {
    switch (error.code) {
      case ChromaKeyError.CAMERA_ACCESS_DENIED:
        showPermissionDialog();
        break;
      case ChromaKeyError.CAMERA_NOT_FOUND:
        showDeviceSelectionDialog();
        break;
      default:
        showGenericError(error.message);
    }
  }
}
```

---

## 6. File Structure

```
src/
├── app/
│   └── chromakey/
│       ├── page.tsx                 # Main page
│       └── layout.tsx               # Layout with metadata
│
├── components/
│   ├── ChromaKeyApp.tsx             # Container component
│   ├── CameraCapture.tsx            # Camera control
│   ├── BackgroundUpload.tsx         # Background upload
│   ├── ControlPanel.tsx             # Settings panel
│   ├── PreviewCanvas.tsx            # Canvas display
│   ├── CameraStatus.tsx             # Status indicator
│   ├── Header.tsx                   # App header
│   ├── Footer.tsx                   # App footer
│   └── ui/                          # Reusable UI components
│       ├── Button.tsx
│       ├── Slider.tsx
│       ├── Switch.tsx
│       ├── Select.tsx
│       └── Alert.tsx
│
├── services/
│   ├── VideoProcessor.ts            # Main processor
│   ├── CameraStreamManager.ts       # Camera management
│   ├── SegmentationEngine.ts        # ML segmentation
│   └── CanvasCompositor.ts          # Image composition
│
├── store/
│   └── chromakeyStore.ts            # Global state (Zustand)
│
├── utils/
│   ├── storage.ts                   # LocalStorage utils
│   ├── performance.ts               # Performance monitoring
│   └── errors.ts                    # Error definitions
│
├── hooks/
│   ├── useCamera.ts                 # Camera hook
│   ├── useVideoProcessor.ts         # Processor hook
│   └── usePerformance.ts            # Performance hook
│
├── types/
│   ├── camera.ts                    # Camera types
│   ├── segmentation.ts              # Segmentation types
│   └── compositor.ts                # Compositor types
│
└── constants/
    ├── config.ts                    # App configuration
    └── defaults.ts                  # Default values
```

---

## 7. Database Schema (Optional - IndexedDB)

### 7.1 Object Stores

#### BackgroundImages Store
```typescript
interface BackgroundImageRecord {
  id: string;                        // UUID
  name: string;
  blob: Blob;
  thumbnail: Blob;
  createdAt: Date;
  lastUsed: Date;
}

// Indexes
- id (primary key)
- lastUsed (for sorting)
```

#### Settings Store
```typescript
interface SettingsRecord {
  key: string;                       // Settings key
  value: any;
  updatedAt: Date;
}

// Indexes
- key (primary key)
```

### 7.2 IndexedDB Implementation

**파일**: `src/services/IndexedDBService.ts`

```typescript
class IndexedDBService {
  private db: IDBDatabase | null = null;
  private DB_NAME = 'ChromaKeyDB';
  private DB_VERSION = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create BackgroundImages store
        if (!db.objectStoreNames.contains('backgroundImages')) {
          const store = db.createObjectStore('backgroundImages', { keyPath: 'id' });
          store.createIndex('lastUsed', 'lastUsed', { unique: false });
        }

        // Create Settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  async saveBackgroundImage(record: BackgroundImageRecord): Promise<void> {
    const transaction = this.db!.transaction(['backgroundImages'], 'readwrite');
    const store = transaction.objectStore('backgroundImages');
    await store.put(record);
  }

  async getBackgroundImages(): Promise<BackgroundImageRecord[]> {
    const transaction = this.db!.transaction(['backgroundImages'], 'readonly');
    const store = transaction.objectStore('backgroundImages');
    const index = store.index('lastUsed');
    return new Promise((resolve, reject) => {
      const request = index.openCursor(null, 'prev'); // Sort by lastUsed desc
      const results: BackgroundImageRecord[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}
```

---

## 8. Performance Optimization

### 8.1 Optimization Strategies

#### 8.1.1 Video Resolution Scaling
```typescript
class PerformanceOptimizer {
  private targetFPS = 60;
  private currentFPS = 0;
  private scaleFactor = 1.0;

  adjustResolution(currentFPS: number, targetFPS: number): number {
    if (currentFPS < targetFPS * 0.8) {
      // FPS too low, reduce resolution
      this.scaleFactor = Math.max(0.5, this.scaleFactor - 0.1);
    } else if (currentFPS > targetFPS * 0.95 && this.scaleFactor < 1.0) {
      // FPS good, increase resolution
      this.scaleFactor = Math.min(1.0, this.scaleFactor + 0.05);
    }
    return this.scaleFactor;
  }
}
```

#### 8.1.2 Frame Skipping
```typescript
class FrameSkipper {
  private processEveryNthFrame = 1;

  shouldProcessFrame(frameCount: number, currentFPS: number): boolean {
    if (currentFPS < 30) {
      this.processEveryNthFrame = 2; // Process every 2nd frame
    } else if (currentFPS > 55) {
      this.processEveryNthFrame = 1; // Process every frame
    }
    return frameCount % this.processEveryNthFrame === 0;
  }
}
```

#### 8.1.3 Canvas Pooling
```typescript
class CanvasPool {
  private pool: HTMLCanvasElement[] = [];
  private maxSize = 5;

  acquire(width: number, height: number): HTMLCanvasElement {
    let canvas = this.pool.pop();
    if (!canvas) {
      canvas = document.createElement('canvas');
    }
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  release(canvas: HTMLCanvasElement): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(canvas);
    }
  }
}
```

### 8.2 Memory Management

```typescript
class ResourceManager {
  private resources: Set<any> = new Set();

  register(resource: any): void {
    this.resources.add(resource);
  }

  dispose(): void {
    for (const resource of this.resources) {
      if (resource.dispose) resource.dispose();
      if (resource.close) resource.close();
    }
    this.resources.clear();
  }
}

// Usage in VideoProcessor
class VideoProcessor {
  private resourceManager = new ResourceManager();

  dispose(): void {
    this.stopRenderLoop();
    this.cameraManager.stopStream();
    this.segmentationEngine.dispose();
    this.resourceManager.dispose();
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

#### CameraStreamManager Test
```typescript
// src/services/__tests__/CameraStreamManager.test.ts
describe('CameraStreamManager', () => {
  let manager: CameraStreamManager;

  beforeEach(() => {
    manager = new CameraStreamManager();
  });

  test('should enumerate camera devices', async () => {
    const devices = await manager.getDevices();
    expect(devices).toBeInstanceOf(Array);
    expect(devices.length).toBeGreaterThan(0);
  });

  test('should start camera stream', async () => {
    await manager.startStream();
    expect(manager.isActive()).toBe(true);
  });

  test('should capture frame from stream', async () => {
    await manager.startStream();
    const frame = manager.getCurrentFrame();
    expect(frame).toBeInstanceOf(ImageData);
    expect(frame.width).toBeGreaterThan(0);
    expect(frame.height).toBeGreaterThan(0);
  });
});
```

#### SegmentationEngine Test
```typescript
// src/services/__tests__/SegmentationEngine.test.ts
describe('SegmentationEngine', () => {
  let engine: SegmentationEngine;

  beforeEach(async () => {
    engine = new SegmentationEngine();
    await engine.initialize('medium');
  });

  test('should initialize model', () => {
    expect(engine.isInitialized()).toBe(true);
  });

  test('should segment frame', async () => {
    const mockFrame = createMockImageData(640, 480);
    const result = await engine.segment(mockFrame);
    expect(result.mask).toBeInstanceOf(ImageData);
    expect(result.width).toBe(640);
    expect(result.height).toBe(480);
  });
});
```

### 9.2 Integration Tests

```typescript
// src/__tests__/integration/VideoProcessor.test.ts
describe('VideoProcessor Integration', () => {
  let processor: VideoProcessor;

  beforeEach(async () => {
    processor = new VideoProcessor({
      onFrameProcessed: jest.fn(),
      onError: jest.fn()
    });
    await processor.initialize();
  });

  test('should process end-to-end pipeline', async () => {
    await processor.startCamera();

    const bgImage = await loadTestImage('test-background.jpg');
    processor.setBackgroundImage(bgImage);

    const canvas = document.createElement('canvas');
    processor.setOutputCanvas(canvas);

    // Wait for a few frames
    await waitForFrames(10);

    // Verify canvas has been rendered
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    expect(imageData.data.some(v => v > 0)).toBe(true);
  });
});
```

### 9.3 E2E Tests (Playwright)

```typescript
// e2e/chromakey.spec.ts
import { test, expect } from '@playwright/test';

test('should enable chromakey effect', async ({ page, context }) => {
  // Grant camera permissions
  await context.grantPermissions(['camera']);

  await page.goto('/chromakey');

  // Start camera
  await page.click('button:has-text("시작")');
  await page.waitForSelector('canvas', { state: 'visible' });

  // Upload background
  await page.setInputFiles('input[type="file"]', 'test-bg.jpg');

  // Enable effect
  await page.click('input[type="checkbox"][aria-label="Enable Effect"]');

  // Wait for processing
  await page.waitForTimeout(2000);

  // Verify FPS counter
  const fpsText = await page.textContent('.fps-counter');
  expect(parseFloat(fpsText!)).toBeGreaterThan(30);
});
```

---

## 10. Security Considerations

### 10.1 Camera Permission Handling

```typescript
class PermissionManager {
  async requestCameraPermission(): Promise<PermissionStatus> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (error) {
      // Fallback: try getUserMedia directly
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  }
}
```

### 10.2 Input Validation

```typescript
class ImageValidator {
  private MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  validate(file: File): { valid: boolean; error?: string } {
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'Invalid file type' };
    }
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large' };
    }
    return { valid: true };
  }
}
```

### 10.3 CSP Configuration

```typescript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net;
  img-src 'self' data: blob:;
  media-src 'self' blob:;
  connect-src 'self' https://cdn.jsdelivr.net;
  style-src 'self' 'unsafe-inline';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  }
];
```

---

## 11. Deployment Configuration

### 11.1 Next.js Configuration

**파일**: `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,

  webpack: (config, { isServer }) => {
    // MediaPipe requires wasm support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Optimize for browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
      };
    }

    return config;
  },

  // CDN optimization
  assetPrefix: process.env.CDN_URL || '',

  // Static export (optional)
  output: 'export',
};

module.exports = nextConfig;
```

### 11.2 Environment Variables

**파일**: `.env.local`

```bash
# MediaPipe CDN
NEXT_PUBLIC_MEDIAPIPE_CDN=https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation

# Performance monitoring
NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true

# Feature flags
NEXT_PUBLIC_ENABLE_RECORDING=false
NEXT_PUBLIC_ENABLE_INDEXEDDB=true
```

### 11.3 Build Optimization

**파일**: `package.json`

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "jest",
    "test:e2e": "playwright test",
    "analyze": "ANALYZE=true next build"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@mediapipe/selfie_segmentation": "^0.1.1675465747",
    "zustand": "^4.4.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-slider": "^1.1.0",
    "@radix-ui/react-switch": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

---

## 12. Implementation Order

### Priority 1: Core Infrastructure (Week 1)
1. ✅ Next.js 프로젝트 초기화
2. ✅ 기본 컴포넌트 구조 생성
3. ✅ CameraStreamManager 구현
4. ✅ 웹캠 접근 및 미리보기
5. ✅ Canvas 렌더링 파이프라인

### Priority 2: ML Integration (Week 2)
6. ✅ MediaPipe 설치 및 설정
7. ✅ SegmentationEngine 구현
8. ✅ 실시간 마스크 생성 테스트
9. ✅ 성능 모니터링 추가

### Priority 3: Background Replacement (Week 3)
10. ✅ CanvasCompositor 구현
11. ✅ 배경 이미지 업로드 UI
12. ✅ 마스크 기반 합성 로직
13. ✅ 엣지 블렌딩

### Priority 4: UI/UX (Week 4)
14. ✅ ControlPanel 구현
15. ✅ 설정 저장/복원 (LocalStorage)
16. ✅ 반응형 디자인
17. ✅ 다국어 지원

### Priority 5: Testing & Polish (Week 5)
18. ✅ Unit 테스트 작성
19. ✅ Integration 테스트
20. ✅ E2E 테스트
21. ✅ 성능 최적화
22. ✅ 접근성 검증

---

## 13. Acceptance Criteria

### 13.1 Functional Criteria
- [ ] 웹캠 접근 및 스트림 캡처 성공
- [ ] 배경 분리 (세그멘테이션) 정상 작동
- [ ] 배경 이미지 교체 정상 작동
- [ ] 실시간 렌더링 60fps 이상 유지
- [ ] UI 컨트롤 정상 작동
- [ ] 스냅샷 저장 기능 작동

### 13.2 Performance Criteria
- [ ] 초기 로딩 < 3초
- [ ] 평균 FPS >= 60
- [ ] 메모리 사용량 < 500MB
- [ ] CPU 사용률 < 80%

### 13.3 Quality Criteria
- [ ] TypeScript 타입 에러 0건
- [ ] ESLint 에러 0건
- [ ] Unit 테스트 커버리지 >= 80%
- [ ] E2E 테스트 모두 통과
- [ ] 접근성 검증 통과 (WCAG 2.1 AA)

---

**Document Info**
- **Created**: 2026-02-09
- **Author**: AI Agent (Claude Sonnet 4.5)
- **Feature**: web-chromakey
- **Status**: Design Phase
- **Related**: `docs/01-plan/features/web-chromakey.plan.md`
- **Next Phase**: Implementation (Do)
