# NICEENTECH 생산관리 시스템

Vue 3 + Vite 웹(PWA)과 Electron 데스크톱 앱. Supabase(Auth, DB, Storage, Realtime, Edge Functions), Firebase Cloud Messaging, Vercel을 쓴다.

## UI 문구

- 사용자가 명시적으로 요청하지 않은 안내성 설명 문구를 화면에 추가하지 않는다.
- 버튼, 제목, 상태값처럼 기능에 필요한 짧은 문구만 사용한다.

## 명령어

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 웹 개발 서버 |
| `npm run build` | 웹 빌드 |
| `npm run electron:dev` | 데스크톱 개발 실행 |
| `npm run desktop:publish` | Windows 설치 파일을 `release/`에 생성 |

자동 테스트, 린트, 타입 검사(`tsconfig`) 설정은 없다. 변경은 `npm run build`와 화면 동작으로 확인한다.

## 구조

- `src/pages/`: 라우트 화면
- `src/features/<기능>/`: 기능별 코드
- `src/lib/supabase.js`: Supabase 클라이언트
- `src/router/index.js`: 라우트와 로그인·권한 검사. Electron에서는 hash 라우터를 쓴다.
- `src/router/roleAccess.js`: 작업자 역할은 `/worker` 화면만 쓴다. `worker.html`은 빌드할 때 `scripts/workerHtmlPlugin.js`가 만든다.
- `src/sw.js`: PWA 서비스 워커와 푸시 수신
- `electron/`: 데스크톱 메인 프로세스
- `supabase/functions/`, `supabase/migrations/`: Edge Function과 DB 변경 SQL

## Supabase

프로젝트는 `joxfohziazjhscewifjj` 하나이고, 운영 DB이며 SPMT와 같이 쓴다.

- DB 스키마·데이터 변경과 Edge Function 배포는 내용을 먼저 알리고 승인받은 뒤 실행한다.
- `supabase db push`와 `supabase migration repair`는 쓰지 않는다. 로컬 마이그레이션 버전과 원격 기록이 맞지 않아(2026-11-25 확인) 예전 SQL이 다시 실행될 수 있다.
- 새 변경은 `supabase/migrations/YYYYMMDDHHMMSS_이름.sql`로 남기고, MCP `apply_migration`으로 하나씩 적용한다.
- 함수별 `verify_jwt` 설정은 `supabase/config.toml`에 있다.
- `shipment-notify`, `notify-shipment` 함수는 배포되어 있지만 이 저장소에 소스가 없다(2026-11-25 확인). 덮어쓰거나 삭제하지 않는다.
- OneSignal은 쓰지 않는다(2026-11-25). `send-push`는 비활성 코드이고, 출고 알림 트리거 `shipment_schedule_notify`는 꺼 두었다.
- 비로그인(`anon`)은 `setting` 조회만 할 수 있다. 새 테이블은 RLS를 켜고 `authenticated` 정책에 `public.is_active_member()` 조건을 넣는다. `spmt_` 테이블은 SPMT 규칙을 따른다.
- 로그인 없이 호출해야 하는 DB 함수가 아니면 `public`과 `anon`의 실행 권한을 회수한다.

## SPMT 공용 DB

테이블을 만들거나 바꾸기 전에 [SPMT_SUPABASE.md](SPMT_SUPABASE.md)를 읽는다.

- SPMT가 새로 만드는 테이블, 뷰, 함수, 인덱스, RLS 정책, Storage 버킷은 `public` 스키마에 `spmt_` 접두사로 만든다. 컬럼에는 붙이지 않는다.
- 나이스엔테크 기존 테이블 이름은 바꾸지 않고, SPMT 행이나 회사 구분 컬럼을 넣지 않는다.
- `spmt_` 테이블에는 인덱스, RLS, `authenticated` 권한과 정책, `chatbot_reader`의 `SELECT` 권한과 읽기 정책을 함께 만든다.
- 비밀번호, 토큰, 서명 키는 테이블에 넣지 않는다. 꼭 필요하면 챗봇 차단 목록에 그 테이블을 추가한다.

## 환경변수와 비밀값

- 로컬 값은 `.env`에 둔다. 브라우저 코드가 읽는 값만 `VITE_` 접두사를 붙인다.
- `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_*` 키에는 `VITE_`를 붙이지 않고 `src/`에서 쓰지 않는다. Edge Function이 쓰는 비밀값은 Supabase secrets에 있다.
- GitHub 저장소가 공개 상태다(2026-11-25 확인). 토큰, 키, 직원 정보를 커밋하지 않고, 문서나 설정 파일에도 토큰 원문을 적지 않는다.

## 커밋

커밋 메시지는 한글로, 무엇이 바뀌는지 한 문장으로 쓴다. 버전업 커밋은 `<버전> 버전업`이다.

## 버전업

"버전업해줘" 요청을 받으면 [RELEASE.md](RELEASE.md)를 읽고 그 순서대로 진행한다. 배포 순서는 바꾸지 않는다.

1. Supabase Storage `update` 버킷에 설치 파일, blockmap, `latest.yml` 업로드
2. 업로드된 `latest.yml`의 버전 확인
3. `public.setting.version`과 `update_message` 업데이트

`release/`, `dist/`, `dist-electron/` 같은 빌드 산출물은 커밋하지 않는다. 스테이징 전에 `git status`로 다른 빌드 폴더가 섞이지 않았는지 확인한다.
