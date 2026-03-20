# sales_as_entries 테이블 문서

## 수집 기준
- 수집 일시: 2026-03-16
- 수집 경로: Supabase MCP `apply_migration` + `execute_sql` 라이브 확인
- 프로젝트: `joxfohziazjhscewifjj`
- 주의: 영업부 보고서의 `AS 발생 입력`용으로 신규 생성

## 기본 정보
- 테이블명: `public.sales_as_entries`
- 용도: 월별 AS 접수건을 직접 입력하고, 영업부 보고서의 `AS 발생 건수` 및 상세 목록에 표시하기 위한 테이블
- PK: `id`
- 월 기준: `target_month`

## 제약 / 인덱스 / 트리거

### 제약조건
- `sales_as_entries_pkey`: PRIMARY KEY (`id`)
- `sales_as_entries_company_list_id_fkey`: FOREIGN KEY (`company_list_id`) REFERENCES `company_list(id)` ON DELETE SET NULL
- `sales_as_entries_created_by_fkey`: FOREIGN KEY (`created_by`) REFERENCES `profiles(id)` ON DELETE SET NULL
- `sales_as_entries_target_month_day_check`: `target_month`는 매월 1일만 허용

### 인덱스
- `sales_as_entries_pkey`: UNIQUE BTREE (`id`)
- `idx_sales_as_entries_target_month`: BTREE (`target_month`)
- `idx_sales_as_entries_company_list_id`: BTREE (`company_list_id`)
- `idx_sales_as_entries_created_by`: BTREE (`created_by`)

### 트리거
- `trg_sales_as_entries_updated_at`: 수정 시 `updated_at` 자동 갱신

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y |  | PK |
| created_at | timestamp with time zone | Y | `now()` | 생성일시 |
| updated_at | timestamp with time zone | Y | `now()` | 수정일시 |
| target_month | date | Y |  | 집계 대상 월, 반드시 해당 월 1일 |
| reported_at | date | N |  | AS 접수일 |
| company_list_id | bigint | N |  | FK -> `company_list.id` |
| company | text | Y | `''::text` | 회사명 |
| place | text | Y | `''::text` | 현장명 |
| issue | text | Y | `''::text` | AS 내용 |
| status | text | Y | `''::text` | 처리 상태 |
| note | text | Y | `''::text` | 비고 |
| image_urls | text[] | Y | `'{}'::text[]` | 첨부 이미지 URL 배열 |
| created_by | uuid | N |  | 입력자, FK -> `profiles.id` |

## 작성 참고 메모
- 영업부 보고서에서는 `target_month` 기준으로 해당 월 AS 건수를 집계하면 됨
- `reported_at`, `company`, `place`, `issue`, `status` 정도만 있어도 현재 화면 구성은 충분함
- 회사/현장은 검색 선택을 위해 `company_list_id`를 같이 저장함
- 이미지는 Supabase Storage `media` 버킷의 `sales/as/...` 경로에 저장하고, DB에는 공개 URL 배열을 보관함
