# 버전 업데이트 방법

## 동작 원리

앱이 실행될 때 두 버전을 비교합니다.

```
package.json "version"           →  현재 설치된 앱의 버전
Supabase setting.version_desktop →  서버에서 지정한 최신 버전
```

**Supabase 값 > package.json 값** 이면 업데이트 다이얼로그가 뜹니다.

---

## 업데이트 배포 순서

### 1단계 — package.json 버전 올리기

```json
"version": "1.0.8"
```

### 2단계 — 빌드 & 배포

```bash
npm run electron:build
```

`dist-electron/` 폴더의 새 `.exe`를 사용자에게 배포합니다.

### 3단계 — Supabase setting 테이블 수정

Supabase 대시보드 → Table Editor → `setting` 테이블  
`version_desktop` 필드를 **배포한 버전과 동일하게** 수정합니다.

```
version_desktop: 1.0.8
```

이 순간부터 구버전(`1.0.7`) 앱을 켜둔 사용자에게 업데이트 다이얼로그가 표시됩니다.

---

## 순서가 중요한 이유

| 상황 | 결과 |
|------|------|
| exe 배포 전에 Supabase 먼저 올리면 | 새 파일 없는데 다이얼로그 뜸 |
| exe 배포 후 Supabase 올리면 | 정상 — 새 파일 받고 나면 다이얼로그 사라짐 |

---

## 버전 번호 규칙

| 자리 | 의미 | 예시 |
|------|------|------|
| Major | 전체 구조 변경 | `1.x.x → 2.0.0` |
| Minor | 새 기능 추가 | `1.0.x → 1.1.0` |
| Patch | 버그 수정, 소소한 개선 | `1.0.7 → 1.0.8` |

---

## 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0.7 | - | 현재 |
