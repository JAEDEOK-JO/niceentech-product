# 버전 업데이트 방법

두 가지 경로로 업데이트가 배포됩니다.

- **웹(브라우저)**: Supabase `setting.version` 변경 감지 → 강제 새로고침 다이얼로그
- **데스크톱(exe)**: Supabase Storage `update` 버킷의 `latest.yml` 감지 → 백그라운드 다운로드 → 재시작 프롬프트 (electron-updater)

---

## Supabase 배포 원칙

**반드시 이 순서로 배포한다.**

1. Supabase Storage `update` 버킷 업로드
2. `latest.yml` 버전 확인
3. `public.setting.version` 업데이트

`setting.version`을 Storage 업로드보다 먼저 올리지 않는다.

---

## 업데이트 배포 순서

### 1단계 — package.json 버전 올리기

```json
"version": "1.0.11"
```

### 2단계 — 빌드

```bash
npm run desktop:publish
```

`release/` 폴더에 아래 파일이 생성됩니다.

```
NICEENTECH Setup 1.0.11.exe
NICEENTECH Setup 1.0.11.exe.blockmap
latest.yml
```

### 3단계 — Supabase Storage 업로드

Supabase 대시보드 또는 CLI로 Storage → **`update`** 버킷에 3개 파일을 업로드합니다.

- `NICEENTECH Setup 1.0.11.exe`
- `NICEENTECH Setup 1.0.11.exe.blockmap`
- `latest.yml` *(기존 `latest.yml`은 삭제 후 재업로드)*

업로드 후 `latest.yml`의 `version`이 새 버전인지 확인합니다.

업로드가 끝나면 실행 중인 Electron 앱이 `latest.yml`을 읽고 자동 다운로드를 시작합니다. 다운로드 완료되면 "지금 재시작 / 나중에" 다이얼로그가 뜹니다.

### 4단계 — Supabase `setting.version` 수정

**3단계 Storage 업로드가 끝난 뒤에** Table Editor 또는 SQL로 `setting.version`을 배포 버전과 동일하게 수정합니다.

```sql
update public.setting
set version = '1.0.11'
returning version, update_message;
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

## 버전 번호 규칙

| 자리 | 의미 | 예시 |
|------|------|------|
| Major | 전체 구조 변경 | `1.x.x → 2.0.0` |
| Minor | 새 기능 추가 | `1.0.x → 1.1.0` |
| Patch | 버그 수정, 소소한 개선 | `1.0.10 → 1.0.11` |
