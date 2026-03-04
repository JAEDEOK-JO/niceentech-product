# NiceEnTech Product

Vue 3 + Vite 기반 생산계획/알림 웹앱입니다.

## 로컬 실행

```bash
npm install
npm run dev
```

## 환경변수

`.env` 또는 배포 환경에 아래 값을 설정해야 합니다.

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Vercel 배포

이 저장소는 `vercel.json`이 포함되어 있어 Vite SPA 배포에 맞춰져 있습니다.

1. Vercel에서 프로젝트 Import
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Environment Variables에 아래 2개 등록
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy 실행

라우터는 `createWebHistory()`를 사용하므로, 새로고침/직접 URL 접근 대응을 위해 모든 경로를 `index.html`로 rewrite 하도록 설정되어 있습니다.

## Electron 데스크톱 실행

기존 Vue 코드를 그대로 사용하고, Electron으로 데스크톱 창만 추가한 구조입니다.

### 운영 모드(온라인 최신 반영)

Electron 패키지 앱은 `desktopRemoteUrl`로 지정된 웹 URL을 직접 엽니다.
따라서 앱 재설치 없이 **재실행만으로 최신 배포본**이 반영됩니다.

`package.json`에서 아래 값을 실제 배포 URL로 바꿔주세요.

```json
"desktopRemoteUrl": "https://your-vercel-url.vercel.app"
```

### 개발 모드

```bash
npm run desktop:dev
```

- Vite 개발 서버 + Electron 창을 동시에 실행합니다.

### 데스크톱 앱 빌드

```bash
npm run desktop:build
```

- 웹 빌드(`dist`) 후 Electron 패키징을 진행합니다.
- 결과물은 `release` 폴더에 생성됩니다.
