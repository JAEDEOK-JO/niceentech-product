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

기존 Vue 코드를 그대로 사용하고, Electron으로 데스크톱 앱을 함께 빌드합니다.

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

### 자동업데이트

- 첫 설치만 `release/NICEENTECH Setup <version>.exe`로 진행합니다.
- 이후에는 앱 실행 시 GitHub Releases의 최신 버전을 자동으로 확인합니다.
- 새 버전이 있으면 백그라운드에서 다운로드하고, 재시작 시 설치됩니다.

자동업데이트는 `electron-updater` + GitHub Releases 기준으로 설정되어 있습니다.

#### 배포 방법

1. `package.json`의 `version` 값을 올립니다.
2. 커밋 후 태그를 생성합니다. 예: `v0.0.1`
3. GitHub에 태그를 push 합니다.

```bash
git tag v0.0.1
git push origin v0.0.1
```

그러면 `.github/workflows/desktop-release.yml` 워크플로가 실행되어 설치 파일과 업데이트 메타데이터를 GitHub Release에 업로드합니다.

#### GitHub Secrets

GitHub Actions에서 아래 Secrets가 필요합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

`GH_TOKEN`은 워크플로 안에서 기본 `GITHUB_TOKEN`을 사용합니다.
