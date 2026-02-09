# Plan: 웹 크로마키 기능 (Web Chroma Key)

## 1. Feature Overview

### 1.1 Feature Name
**Web Chroma Key** (웹 크로마키)

### 1.2 Purpose
웹브라우저에서 사용자의 웹캠 영상을 실시간으로 처리하여 배경을 다른 이미지로 대체하는 크로마키 기능을 제공합니다. 화상회의, 온라인 스트리밍, 콘텐츠 제작 등에서 사용자가 원하는 배경 이미지를 자유롭게 적용할 수 있습니다.

### 1.3 Target Users
- 화상회의/원격근무 사용자
- 온라인 콘텐츠 크리에이터
- 스트리머 및 방송인
- 일반 웹캠 사용자

### 1.4 Expected Outcomes
- 실시간 웹캠 영상 캡처 및 처리
- 사람 영역과 배경 영역의 정확한 분리
- 원하는 배경 이미지로의 실시간 교체
- 60fps 이상의 부드러운 렌더링 성능
- 크로스 브라우저 호환성 (Chrome, Edge, Firefox, Safari)

## 2. Requirements

### 2.1 Functional Requirements

#### FR-01: 웹캠 접근 및 스트림 캡처
- 브라우저의 `getUserMedia` API를 통한 웹캠 접근
- 실시간 비디오 스트림 캡처
- 카메라 권한 요청 및 에러 처리
- 다중 카메라 선택 지원

#### FR-02: 배경 분리 (Segmentation)
- MediaPipe Selfie Segmentation 또는 TensorFlow.js BodyPix 활용
- 사람 영역과 배경 영역의 실시간 분리
- 세그멘테이션 마스크 생성
- 성능 최적화 (모델 크기 선택: light/general/heavy)

#### FR-03: 배경 이미지 교체
- 사용자가 업로드한 이미지를 배경으로 설정
- 세그멘테이션 마스크를 활용한 합성
- 배경 이미지 크기 조정 및 정렬 (cover/contain/stretch)
- 배경 블러 효과 옵션 제공

#### FR-04: 실시간 렌더링
- Canvas API를 활용한 프레임 단위 렌더링
- RequestAnimationFrame을 통한 부드러운 애니메이션
- 60fps 이상 유지
- 메모리 누수 방지

#### FR-05: UI 컨트롤
- 카메라 시작/중지 버튼
- 배경 이미지 업로드 버튼
- 배경 효과 on/off 토글
- 세그멘테이션 품질 조절 슬라이더
- 배경 블러 강도 조절

#### FR-06: 미리보기 및 다운로드
- 실시간 미리보기 화면
- 처리된 영상의 스냅샷 저장 (PNG)
- 선택적으로 녹화 기능 (WebM)

### 2.2 Non-Functional Requirements

#### NFR-01: Performance
- 초기 모델 로딩 시간: 3초 이내
- 프레임 처리 속도: 60fps 이상
- 메모리 사용량: 500MB 이하
- CPU 사용률: 80% 이하

#### NFR-02: Compatibility
- Chrome 90+
- Edge 90+
- Firefox 88+
- Safari 14+ (제한적 지원)
- 모바일 브라우저 지원 (iOS Safari, Chrome Mobile)

#### NFR-03: Usability
- 직관적인 UI/UX
- 3단계 이내의 기능 접근
- 실시간 피드백 제공
- 에러 메시지 명확화

#### NFR-04: Accessibility
- 키보드 네비게이션 지원
- 스크린 리더 호환성
- WCAG 2.1 AA 준수
- 다국어 지원 (한국어, 영어)

## 3. Technical Approach

### 3.1 Technology Stack

#### Frontend Framework
- **Next.js 14** (App Router)
- React 18 (함수형 컴포넌트, Hooks)
- TypeScript 5

#### ML/AI Libraries
- **Option 1**: MediaPipe Selfie Segmentation (권장)
  - 장점: 경량, 빠른 속도, 높은 정확도
  - 단점: Google 의존성
- **Option 2**: TensorFlow.js + BodyPix
  - 장점: 오픈소스, 커스터마이징 가능
  - 단점: 무겁고 상대적으로 느림

#### Browser APIs
- `getUserMedia`: 웹캠 접근
- Canvas API: 이미지 렌더링 및 합성
- Web Workers: 백그라운드 처리 (선택)
- IndexedDB: 설정 및 이미지 저장 (선택)

#### UI Library
- Tailwind CSS
- Radix UI (Headless Components)
- Framer Motion (애니메이션)

### 3.2 Architecture Overview

```
┌─────────────────────────────────────────────┐
│           User Interface (React)            │
│  ┌────────┐ ┌─────────┐ ┌──────────────┐  │
│  │ Camera │ │ Upload  │ │   Controls   │  │
│  │ View   │ │ Button  │ │  (Sliders)   │  │
│  └────────┘ └─────────┘ └──────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         Video Processing Engine             │
│  ┌──────────────────────────────────────┐  │
│  │  MediaPipe Selfie Segmentation       │  │
│  │  (or TensorFlow.js BodyPix)          │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│          Canvas Rendering Layer             │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Video   │  │  Mask     │  │ Background│ │
│  │  Frame   │→ │ Application│→│  Composite│ │
│  └──────────┘  └───────────┘  └─────────┘ │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│              Output Display                 │
│         (Canvas / Video Element)            │
└─────────────────────────────────────────────┘
```

### 3.3 Key Components

#### 1. CameraCapture Component
- 웹캠 접근 및 스트림 관리
- 카메라 목록 조회 및 선택
- 권한 요청 처리

#### 2. SegmentationEngine
- ML 모델 로딩 및 초기화
- 프레임 단위 세그멘테이션 실행
- 마스크 데이터 생성

#### 3. BackgroundCompositor
- 배경 이미지 로딩 및 전처리
- 마스크를 활용한 이미지 합성
- Canvas 렌더링 최적화

#### 4. VideoProcessor (Main Controller)
- 전체 파이프라인 조율
- RequestAnimationFrame 루프 관리
- 성능 모니터링

#### 5. UI Controls
- 설정 패널
- 실시간 프리뷰
- 업로드/다운로드 인터페이스

### 3.4 Data Flow

```
1. User grants camera permission
2. Video stream captured from getUserMedia
3. Each frame extracted to Canvas
4. Frame sent to Segmentation Model
5. Segmentation mask returned
6. Mask applied to separate foreground/background
7. Background replaced with user image
8. Composite rendered to output Canvas
9. Loop continues at 60fps
```

## 4. Implementation Plan

### 4.1 Phase Breakdown

#### Phase 1: Core Setup (Week 1)
- Next.js 프로젝트 초기화
- 기본 UI 레이아웃 구성
- 웹캠 접근 및 미리보기 구현
- Canvas 렌더링 파이프라인 구축

#### Phase 2: ML Integration (Week 2)
- MediaPipe Selfie Segmentation 통합
- 세그멘테이션 모델 로딩 및 초기화
- 실시간 마스크 생성 테스트
- 성능 최적화

#### Phase 3: Background Replacement (Week 3)
- 배경 이미지 업로드 기능
- 마스크 기반 합성 로직
- 배경 크기 조정 및 정렬
- 엣지 블렌딩 (feathering)

#### Phase 4: UI/UX Enhancement (Week 4)
- 컨트롤 패널 구현
- 슬라이더 및 토글 추가
- 반응형 디자인
- 다국어 지원

#### Phase 5: Testing & Optimization (Week 5)
- 크로스 브라우저 테스트
- 성능 프로파일링
- 메모리 누수 검사
- 접근성 검증

### 4.2 Milestones

| Milestone | Deliverable | Deadline |
|-----------|-------------|----------|
| M1 | 웹캠 캡처 및 Canvas 렌더링 | Week 1 |
| M2 | 세그멘테이션 모델 통합 | Week 2 |
| M3 | 배경 교체 기능 완성 | Week 3 |
| M4 | UI/UX 완성 및 폴리싱 | Week 4 |
| M5 | 최종 테스트 및 배포 | Week 5 |

## 5. Risks and Mitigations

### 5.1 Technical Risks

#### Risk 1: 성능 저하 (60fps 미달)
- **Impact**: High
- **Probability**: Medium
- **Mitigation**:
  - Light 모델 사용
  - 해상도 다운스케일링 (480p → 360p)
  - Web Workers로 처리 오프로드
  - GPU 가속 활성화

#### Risk 2: 브라우저 호환성 문제
- **Impact**: Medium
- **Probability**: High
- **Mitigation**:
  - Feature detection 구현
  - Polyfills 제공
  - Fallback UI 준비
  - 지원 브라우저 명시

#### Risk 3: 세그멘테이션 정확도 부족
- **Impact**: Medium
- **Probability**: Low
- **Mitigation**:
  - 고품질 모델 옵션 제공
  - 후처리 필터 적용 (모폴로지 연산)
  - 사용자 피드백 수집
  - 모델 업데이트 계획

### 5.2 Resource Risks

#### Risk 4: ML 모델 다운로드 실패
- **Impact**: High
- **Probability**: Low
- **Mitigation**:
  - CDN 다중화
  - 로컬 캐싱 (Service Worker)
  - 재시도 로직
  - 오프라인 감지 및 안내

#### Risk 5: 메모리 누수
- **Impact**: High
- **Probability**: Medium
- **Mitigation**:
  - 명시적 리소스 해제
  - 프로파일링 도구 사용
  - 주기적 메모리 모니터링
  - Canvas 재사용

## 6. Success Criteria

### 6.1 Performance Metrics
- [ ] 초기 로딩 < 3초
- [ ] 평균 FPS >= 60
- [ ] 메모리 사용량 < 500MB
- [ ] CPU 사용률 < 80%

### 6.2 Functional Metrics
- [ ] 웹캠 접근 성공률 > 95%
- [ ] 세그멘테이션 정확도 > 90%
- [ ] 배경 교체 지연 < 100ms
- [ ] 에러 발생률 < 1%

### 6.3 User Satisfaction
- [ ] 사용자 만족도 > 4.0/5.0
- [ ] 재사용 의도 > 80%
- [ ] 버그 리포트 < 5건/월
- [ ] 기능 개선 요청 수집

## 7. Dependencies

### 7.1 External Libraries
- `@mediapipe/selfie_segmentation`: ^0.1.1675465747
- `next`: ^14.0.0
- `react`: ^18.2.0
- `typescript`: ^5.0.0
- `tailwindcss`: ^3.4.0

### 7.2 Browser APIs
- getUserMedia (WebRTC)
- Canvas 2D Context
- RequestAnimationFrame
- FileReader API

### 7.3 Optional Dependencies
- `@tensorflow/tfjs`: (TensorFlow.js 사용 시)
- `@tensorflow-models/body-pix`: (BodyPix 사용 시)

## 8. Future Enhancements

### 8.1 Short-term (v1.1)
- 가상 배경 템플릿 제공 (라이브러리)
- 배경 블러 강도 조절
- 녹화 및 다운로드 기능

### 8.2 Mid-term (v1.5)
- 실시간 필터 효과 (색상 보정, 뷰티 모드)
- 다중 사용자 지원 (화면 분할)
- 배경 음악 추가

### 8.3 Long-term (v2.0)
- 3D 가상 배경 (Three.js)
- AR 필터 및 효과
- WebRTC 통합 (화상회의 SDK)

## 9. References

### 9.1 Documentation
- [MediaPipe Selfie Segmentation](https://google.github.io/mediapipe/solutions/selfie_segmentation.html)
- [Web API: getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

### 9.2 Related Projects
- Zoom Virtual Background
- Google Meet Background Blur
- OBS Virtual Camera

---

**Document Info**
- **Created**: 2026-02-09
- **Author**: AI Agent (Claude Sonnet 4.5)
- **Feature**: web-chromakey
- **Status**: Planning Phase
- **Next Phase**: Design
