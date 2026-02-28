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
