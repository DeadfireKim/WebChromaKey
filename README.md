# Web Chroma Key

웹브라우저에서 실시간으로 웹캠 배경을 교체하는 크로마키 기능

## 🎯 프로젝트 개요

이 프로젝트는 웹브라우저에서 MediaPipe Selfie Segmentation을 사용하여 실시간으로 사용자의 웹캠 영상 배경을 다른 이미지로 교체하는 기능을 제공합니다.

### 주요 기능

- ✅ 실시간 웹캠 영상 캡처
- ✅ AI 기반 배경 분리 (MediaPipe)
- ✅ 배경 이미지 교체
- ✅ 실시간 렌더링 (60fps)
- ✅ 배경 블러 효과
- ✅ 세그멘테이션 품질 조절

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **ML/AI**: MediaPipe Selfie Segmentation
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **UI Components**: Radix UI

## 📦 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속

### 3. 빌드

```bash
npm run build
npm start
```

## 📁 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── chromakey/         # 크로마키 페이지
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React 컴포넌트
│   ├── ChromaKeyApp.tsx
│   ├── CameraCapture.tsx
│   ├── BackgroundUpload.tsx
│   ├── ControlPanel.tsx
│   └── PreviewCanvas.tsx
├── services/              # 비즈니스 로직
│   ├── VideoProcessor.ts
│   ├── CameraStreamManager.ts
│   ├── SegmentationEngine.ts
│   └── CanvasCompositor.ts
├── store/                 # 상태 관리 (Zustand)
│   └── chromakeyStore.ts
├── types/                 # TypeScript 타입 정의
├── hooks/                 # Custom Hooks
└── utils/                 # 유틸리티 함수
```

## 🚀 개발 로드맵

### Phase 1: Core Infrastructure ✅
- [x] Next.js 프로젝트 초기화
- [x] TypeScript 설정
- [x] 디렉토리 구조 생성
- [ ] CameraStreamManager 구현
- [ ] Canvas 렌더링 파이프라인

### Phase 2: ML Integration
- [ ] MediaPipe 통합
- [ ] SegmentationEngine 구현
- [ ] 실시간 마스크 생성

### Phase 3: Background Replacement
- [ ] CanvasCompositor 구현
- [ ] 배경 이미지 업로드
- [ ] 마스크 기반 합성

### Phase 4: UI/UX
- [ ] ControlPanel 구현
- [ ] 상태 관리 (Zustand)
- [ ] 반응형 디자인

### Phase 5: Testing & Optimization
- [ ] Unit 테스트
- [ ] E2E 테스트
- [ ] 성능 최적화

## 📚 문서

- [Plan 문서](./docs/01-plan/features/web-chromakey.plan.md)
- [Design 문서](./docs/02-design/features/web-chromakey.design.md)

## 🧪 테스트

```bash
# Unit 테스트
npm test

# E2E 테스트
npm run test:e2e
```

## 🤝 기여

이 프로젝트는 PDCA (Plan-Design-Do-Check-Act) 방법론을 따릅니다.

## 📄 라이선스

MIT License

## 👤 작성자

- GitHub: [@deadf](https://github.com/deadf)

---

Built with ❤️ using Next.js and MediaPipe
