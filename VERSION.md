# 버전 업데이트 방법

두 가지 경로로 업데이트가 배포됩니다.

- **웹(브라우저)**: Supabase `setting.version` 변경 감지 → 강제 새로고침 다이얼로그
- **데스크톱(exe)**: Supabase Storage `update` 버킷의 `latest.yml` 감지 → 백그라운드 다운로드 → 재시작 프롬프트 (electron-updater)

---

## 업데이트 배포 순서

### 1단계 — package.json 버전 올리기

```json
"version": "1.0.11"
```

### 2단계 — 빌드

```bash
npm run electron:build
```

`dist-electron/` 폴더에 아래 파일이 생성됩니다.

```
NICEENTECH Setup 1.0.11.exe
NICEENTECH Setup 1.0.11.exe.blockmap
latest.yml
```

### 3단계 — Supabase Storage 업로드

Supabase 대시보드 → Storage → **`update`** 버킷에 3개 파일을 업로드합니다.

- `NICEENTECH Setup 1.0.11.exe`
- `NICEENTECH Setup 1.0.11.exe.blockmap`
- `latest.yml` *(기존 파일 덮어쓰기)*

업로드 즉시 실행 중인 모든 Electron 앱이 다음 실행 때(또는 현재 실행 중이면 체크 시점에) 자동 다운로드를 시작합니다. 다운로드 완료되면 "지금 재시작 / 나중에" 다이얼로그가 뜹니다.

### 4단계 — Supabase `setting.version` 수정 *(웹 클라이언트용)*

Supabase 대시보드 → Table Editor → `setting` 테이블 → `version` 필드를 배포 버전과 동일하게 수정.

```
version: 1.0.11
```

이 순간부터 **웹**으로 접속한 구버전 사용자에게 강제 새로고침 다이얼로그가 표시됩니다.

---

## 동작 원리

### 데스크톱 (Electron)

- `electron-updater`가 `https://<supabase>.co/storage/v1/object/public/update/latest.yml` 을 읽고 버전 비교
- 설치된 앱보다 `latest.yml` 의 버전이 높으면 exe 를 백그라운드에서 다운로드
- 다운로드 완료 시 메인 프로세스가 재시작 다이얼로그 표시
- 재시작하면 새 exe로 자동 설치됨 (사용자가 NSIS 설치 마법사를 다시 돌릴 필요 없음)

### 웹

- 앱 시작 시 Supabase `setting.version` 조회 + Realtime 구독
- 앱의 `package.json` 버전과 Supabase `setting.version` 이 **다르면** 다이얼로그 표시
- "지금 업데이트" → `window.location.reload()` → 최신 번들 로드

---

## 순서 권장

1. exe + latest.yml 업로드 **먼저** → 데스크톱 사용자 자동 다운로드 시작
2. `setting.version` 수정 → 웹 사용자 강제 새로고침

순서가 반대가 돼도 큰 문제는 없지만, 웹 사용자가 새로고침했을 때 데스크톱 업데이트 파일이 아직 없으면 의미가 없으니 exe 먼저 올리는 게 안전합니다.

---

## 버전 번호 규칙

| 자리 | 의미 | 예시 |
|------|------|------|
| Major | 전체 구조 변경 | `1.x.x → 2.0.0` |
| Minor | 새 기능 추가 | `1.0.x → 1.1.0` |
| Patch | 버그 수정, 소소한 개선 | `1.0.10 → 1.0.11` |
