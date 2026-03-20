# sales_weekly_entries 테이블 문서

## 수집 기준
- 수집 일시: 2026-03-16
- 수집 경로: Supabase MCP `apply_migration` + `execute_sql` 라이브 확인
- 프로젝트: `joxfohziazjhscewifjj`
- 주의: 영업부 보고서의 `현재 매출` 입력용으로 신규 생성

## 기본 정보
- 테이블명: `public.sales_weekly_entries`
- 용도: 월별 주차 단위 매출을 직접 입력하고, 월 합계를 계산하기 위한 테이블
- PK: `id`
- 입력 방식 예시:
  - `target_month = 2026-03-01`, `week_index = 1`, `sales_amount = 120000000`
  - `target_month = 2026-03-01`, `week_index = 2`, `sales_amount = 90000000`
- 월 합계 계산:
  - 같은 `target_month`의 `sales_amount` 합계

## 제약 / 인덱스 / 트리거

### 제약조건
- `sales_weekly_entries_pkey`: PRIMARY KEY (`id`)
- `sales_weekly_entries_target_month_week_unique`: UNIQUE (`target_month`, `week_index`)
- `sales_weekly_entries_created_by_fkey`: FOREIGN KEY (`created_by`) REFERENCES `profiles(id)` ON DELETE SET NULL
- `sales_weekly_entries_target_month_day_check`: `target_month`는 매월 1일만 허용
- `sales_weekly_entries_week_index_check`: `week_index`는 1~5만 허용

### 인덱스
- `sales_weekly_entries_pkey`: UNIQUE BTREE (`id`)
- `sales_weekly_entries_target_month_week_unique`: UNIQUE BTREE (`target_month`, `week_index`)
- `idx_sales_weekly_entries_target_month`: BTREE (`target_month`)
- `idx_sales_weekly_entries_created_by`: BTREE (`created_by`)

### 트리거
- `trg_sales_weekly_entries_updated_at`: 수정 시 `updated_at` 자동 갱신

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y |  | PK |
| created_at | timestamp with time zone | Y | `now()` | 생성일시 |
| updated_at | timestamp with time zone | Y | `now()` | 수정일시 |
| target_month | date | Y |  | 집계 대상 월, 반드시 해당 월 1일 |
| week_index | integer | Y |  | 주차 번호, 1~5 |
| sales_amount | numeric | Y | `0` | 해당 주차 매출 |
| note | text | Y | `''::text` | 비고 |
| created_by | uuid | N |  | 입력자, FK -> `profiles.id` |

## 작성 참고 메모
- `현재 매출`은 아직 `product_list`에 연결하지 않고 이 테이블에서 직접 월별 합계를 계산하면 됨
- 화면에서는 `3월 첫째주`, `3월 둘째주`처럼 주차별 입력 UI를 두고 저장하면 됨
- 월 합계는 `sum(sales_amount)`로 바로 계산 가능
- 필요하면 나중에 `department`, `branch`, `target_year` 같은 차원을 더 붙일 수 있지만 지금은 이 구조가 가장 단순함
