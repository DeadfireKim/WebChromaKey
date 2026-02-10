# Web Chroma Key - Standalone Demo

이 폴더는 서버 없이 바로 브라우저에서 실행할 수 있는 순수 HTML/JS/CSS 데모입니다.

## 🚀 사용 방법

### Option 1: 직접 열기
1. `index.html` 파일을 더블클릭하거나
2. 브라우저로 드래그 앤 드롭

### Option 2: Live Server (추천)
VSCode에서:
1. `index.html` 우클릭
2. "Open with Live Server" 선택

### Option 3: 간단한 HTTP 서버
```bash
# Python 3
cd demo
python -m http.server 8000

# Node.js (npx http-server)
npx http-server demo -p 8000
```

그 다음 브라우저에서 `http://localhost:8000` 접속

## ✨ 주요 기능

### 1. 카메라 제어
- 카메라 선택 드롭다운
- 시작/중지 버튼
- 실시간 FPS 표시

### 2. AI 배경 제거
- MediaPipe Selfie Segmentation 사용
- 품질 선택 (낮음/중간/높음)
- 실시간 마스크 생성

### 3. 배경 효과
- **없음**: 원본 영상
- **블러**: 배경 흐리게
- **교체**: 배경 이미지로 교체

### 4. 고급 설정
- **블러 강도**: 0-100% (블러 모드)
- **경계선 부드럽기**: 0-50% (자연스러운 전환)
- **마스크 조임**: 0-100% (외곽선 타이트하게)

## 📁 파일 구조

```
demo/
├── index.html    # 메인 HTML (UI 구조)
├── styles.css    # 스타일시트 (다크 테마)
├── app.js        # 전체 로직 (카메라, AI, 컴포지팅)
└── README.md     # 이 파일
```

## 🎯 사용 시나리오

### 시나리오 1: 화상 회의 배경 변경
1. 카메라 시작
2. 배경 제거 ON
3. 배경 이미지 업로드
4. 배경 모드 → 교체

### 시나리오 2: 배경 블러
1. 카메라 시작
2. 배경 제거 ON
3. 배경 모드 → 블러
4. 블러 강도 조절

### 시나리오 3: 외곽선 조정
1. 배경 효과 적용
2. 경계선 부드럽기로 자연스럽게
3. 마스크 조임으로 정확도 조절

## 🔧 기술 스택

- **HTML5**: Canvas API
- **Vanilla JavaScript**: ES6+ 클래스
- **MediaPipe**: AI 배경 분리
- **CSS3**: 다크 테마, 반응형 디자인

## 💡 브라우저 요구사항

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- HTTPS 또는 localhost (카메라 접근 필요)

## 🎨 커스터마이징

### 색상 테마 변경
`styles.css`에서 다음 변수 수정:
```css
background: #0f0f0f;  /* 배경색 */
color: #e5e5e5;       /* 텍스트 */
#3b82f6;              /* 프라이머리 색상 */
```

### 기본 해상도 변경
`app.js`에서 수정:
```javascript
width: { ideal: 640 },   // 가로
height: { ideal: 480 },  // 세로
```

### MediaPipe 품질 조정
`app.js`의 `modelSelection`:
- `0`: 일반 모델 (빠름)
- `1`: 풍경 모델 (정확)

## 📊 성능 최적화

구현된 최적화:
- Canvas 재사용 (메모리 절약)
- RAF (RequestAnimationFrame) 루프
- 마스크 캐싱
- 조건부 렌더링

예상 성능:
- **낮음 품질**: 50-60 FPS
- **중간 품질**: 30-45 FPS
- **높음 품질**: 20-30 FPS

## 🐛 문제 해결

### 카메라가 안 보여요
- 브라우저 권한 확인
- HTTPS 또는 localhost 사용
- 다른 앱에서 카메라 사용 중인지 확인

### MediaPipe 로딩 실패
- 인터넷 연결 확인 (CDN 필요)
- 브라우저 콘솔 에러 확인
- 페이지 새로고침

### FPS가 낮아요
- 품질을 "낮음"으로 변경
- 브라우저 하드웨어 가속 확인
- 다른 탭/앱 종료

### 경계선이 거칠어요
- "경계선 부드럽기" 증가
- 조명 개선
- 품질을 "높음"으로 변경

## 📦 배포하기

### GitHub Pages
1. 이 폴더를 레포지토리 루트 또는 `docs/` 폴더로 복사
2. Settings → Pages에서 활성화
3. `https://username.github.io/repo-name/` 접속

### Netlify Drop
1. demo 폴더를 압축
2. [netlify.app/drop](https://app.netlify.com/drop) 접속
3. 압축 파일 드롭

### Vercel
```bash
npx vercel demo/
```

## 🔗 관련 링크

- [MediaPipe Documentation](https://google.github.io/mediapipe/)
- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [getUserMedia Guide](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

## 📝 라이센스

이 데모는 학습 및 개인 프로젝트 용도로 자유롭게 사용 가능합니다.

---

**Made with ❤️ using MediaPipe & Vanilla JS**
