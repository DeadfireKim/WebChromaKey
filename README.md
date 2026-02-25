# Web Chroma Key

실시간 웹캠 배경 교체 - 순수 HTML/CSS/JavaScript 구현

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://deadfirekim.github.io/WebChromaKey/)

## 🎯 프로젝트 개요

웹브라우저에서 **서버 없이** 바로 실행 가능한 AI 기반 실시간 배경 교체 애플리케이션입니다.
> https://deadfirekim.github.io/WebChromaKey/
MediaPipe Selfie Segmentation을 활용하여 웹캠 영상의 배경을 실시간으로 제거하고 블러 또는 커스텀 이미지로 교체합니다.

## ✨ 주요 기능

### 🎥 실시간 처리
- 웹캠 실시간 캡처 및 렌더링
- 60fps 고속 처리 (품질에 따라 조절)
- 레이턴시 최소화

### 🤖 AI 배경 제거
- MediaPipe Selfie Segmentation 활용
- 3단계 품질 설정 (낮음/중간/높음)
- 자동 해상도 스케일링

### 🎨 배경 효과
- **없음**: 원본 영상
- **블러**: 배경 흐리게 처리
- **교체**: 커스텀 배경 이미지

### ⚙️ 고급 설정
- **블러 강도**: 0-100% 조절
- **경계선 부드럽기**: 0-100% (자연스러운 전환)
- **마스크 조임**: 0-100% (외곽선 정밀도)
- **AI 품질**: 처리 속도 vs 정확도 선택

## 🚀 사용 방법

### 온라인 데모 (추천)
바로 사용 가능: **https://deadfirekim.github.io/WebChromaKey/**

### 로컬 실행

#### Option 1: 브라우저에서 직접 열기
```bash
cd docs
# index.html을 더블클릭하거나 브라우저로 드래그
```

#### Option 2: Live Server (VSCode)
```bash
cd docs
# index.html 우클릭 → "Open with Live Server"
```

#### Option 3: 간단한 HTTP 서버
```bash
# Python
cd docs
python -m http.server 8000

# Node.js
npx http-server docs -p 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

## 📁 프로젝트 구조

```
WebChromaKey/
├── docs/                   # Standalone 앱 (GitHub Pages 배포)
│   ├── index.html         # UI 구조
│   ├── app.js             # 전체 로직 (600+ lines)
│   ├── styles.css         # 다크테마 스타일
│   └── README.md          # 상세 사용법
├── demo/                   # 개발용 원본
└── README.md              # 이 파일
```

## 🛠️ 기술 스택

- **HTML5**: Canvas API, getUserMedia
- **Vanilla JavaScript**: ES6+ Class, Async/Await
- **MediaPipe**: Selfie Segmentation (CDN)
- **CSS3**: Modern layout, Dark theme

**서버 불필요** - 모든 처리가 브라우저에서 실행됩니다.

## 💻 시스템 요구사항

### 브라우저
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

### 주요 요구사항
- **HTTPS 또는 localhost**: 카메라 접근 권한 필요
- **최소 RAM**: 4GB
- **권장 사양**: 8GB RAM, 현대적 GPU

## 📊 성능

| AI 품질 | 처리 해상도 | 예상 FPS | 정확도 |
|---------|------------|---------|--------|
| 낮음 | 320×240 | 50-60 | ⭐⭐ |
| 중간 | 640×480 | 30-45 | ⭐⭐⭐ |
| 높음 | 640×480 (모델 1) | 20-30 | ⭐⭐⭐⭐ |

## 🎮 사용 예시

### 화상 회의 배경 변경
```
1. 카메라 시작
2. "블러" 또는 "교체" 선택
3. AI 모델 자동 로딩 (3초)
4. 배경 이미지 업로드 (교체 모드)
5. 슬라이더로 세부 조정
```

### 실시간 스트리밍
- OBS 가상 카메라와 연동 가능
- 브라우저 캡처로 방송 소스 활용

## 🐛 문제 해결

### 카메라가 안 보여요
- 브라우저 카메라 권한 확인
- HTTPS 또는 localhost 사용
- 다른 앱에서 카메라 사용 중인지 확인

### MediaPipe 로딩 실패
- 인터넷 연결 확인 (CDN 필요)
- 브라우저 콘솔 에러 확인
- F5로 새로고침

### FPS가 낮아요
- AI 품질을 "낮음"으로 변경
- 브라우저 하드웨어 가속 확인
- 다른 탭/앱 종료

### 경계선이 거칠어요
- "경계선 부드럽기" 슬라이더 증가
- 조명 개선 (밝은 환경)
- AI 품질을 "높음"으로 변경

## 🌐 배포

### GitHub Pages
이미 배포됨: https://deadfirekim.github.io/WebChromaKey/

### Netlify Drop
```bash
zip -r web-chromakey.zip docs/
# https://app.netlify.com/drop 접속
# 압축 파일 드롭
```

### Vercel
```bash
npx vercel docs/
```

## 📚 추가 문서

- [상세 사용 가이드](./docs/README.md)
- [개발 계획](./docs/01-plan/features/web-chromakey.plan.md)
- [설계 문서](./docs/02-design/features/web-chromakey.design.md)
- [갭 분석 리포트](./docs/03-analysis/web-chromakey.analysis.md)

## 🔗 참고 링크

- [MediaPipe Documentation](https://google.github.io/mediapipe/)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [getUserMedia Guide](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## 📄 라이선스

MIT License - 학습 및 개인 프로젝트 용도로 자유롭게 사용 가능

## 👤 작성자

- GitHub: [@DeadfireKim](https://github.com/DeadfireKim)
- Repository: [WebChromaKey](https://github.com/DeadfireKim/WebChromaKey)

---

**Made with ❤️ using MediaPipe & Vanilla JavaScript**

No frameworks, No build tools, No server required!
