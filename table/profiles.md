# profiles 테이블 문서

## 수집 기준
- 수집 일시: 2026-02-23
- 수집 경로: Supabase MCP (`list_projects`, `list_tables`, `execute_sql`)
- 프로젝트: `joxfohziazjhscewifjj`

## 기본 정보
- 테이블명: `public.profiles`
- Primary Key: `id`
- Foreign Key:
  - `profiles_id_fkey`: `profiles.id` -> `auth.users.id`

## 트리거 / 제약사항
- 제약(Constraints):
  - `profiles_pkey` (PRIMARY KEY): `id`
  - `profiles_id_fkey` (FOREIGN KEY): `id` -> `auth.users.id`
  - `2200_17496_1_not_null` (CHECK): `id IS NOT NULL`
  - `2200_17496_13_not_null` (CHECK): `work_man IS NOT NULL`
- 인덱스(Indexes):
  - `profiles_pkey` (UNIQUE INDEX on `id`)
  - `idx_profiles_role` (btree `lower(coalesce(role, ''))`)
- 트리거(Triggers):
  - 조회 결과 없음

## 컬럼 목록

| 컬럼 | 타입(format) | Required | Default | 주석 |
|---|---|---:|---|---|
| id | string (uuid) | Y |  | PK |
| name | string (text) | N |  | 이름 |
| department | string (text) | N |  | 부서 |
| position | string (text) | N |  | 직급 |
| role | string (text) | N |  | 권한 역할 |
| activate | boolean (boolean) | N | true | 활성화 여부 |
| phone | string (text) | N |  | 연락처 |
| created_at | string (timestamp with time zone) | N | now() | 생성일시 |
| updated_at | string (timestamp with time zone) | N | now() | 수정일시 |
| is_vendor | boolean (boolean) | N | false | 협력사 여부 |
| email | string (text) | N |  | 이메일 |
| signature_path | string (text) | N |  | 서명 파일 경로 |
| work_man | string (text) | Y | `'없음'::text` | 워크맨 표시값 |

## 앱 연동 메모
- 현재 프론트에서 사용 중인 필드:
  - `name`
  - `position`
  - `department`
  - `work_man` (없을 때 `'없음'` 보정)
