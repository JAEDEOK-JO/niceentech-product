# company_list 테이블 문서

## 수집 기준
- 수집 일시: 2026-03-16
- 수집 경로: Supabase MCP `execute_sql` + `list_tables` 라이브 조회
- 프로젝트: `joxfohziazjhscewifjj`
- 주의: 데이터 변경/삭제 없이 메타데이터만 확인

## 기본 정보
- 테이블명: `public.company_list`
- 예상 용도: 회사/현장 기본정보와 담당자, 사업자정보, 기간 정보를 저장
- PK: `id`
- 현재 행 수: 약 `283`
- 주요 연관:
  - `product_list.company_info` -> `company_list.id`
  - `manager_id` -> `profiles.id`

## 제약 / 인덱스 / 트리거

### 제약조건
- `company_list_pkey`: PRIMARY KEY (`id`)
- `company_list_manager_id_fkey`: FOREIGN KEY (`manager_id`) REFERENCES `profiles(id)` ON DELETE SET NULL

### 인덱스
- `company_list_pkey`: UNIQUE BTREE (`id`)
- `idx_company_list_manager_id`: BTREE (`manager_id`)

### 트리거
- 없음

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y |  | PK |
| created_at | timestamp with time zone | N | `now()` | 생성일시 |
| company | text | N |  | 회사명 |
| place | text | N |  | 현장명 |
| full_name | text | N |  | 회사/현장 전체명으로 보이는 조합 필드 |
| initial | text | N |  | 약칭 또는 코드 |
| director_name | character varying | N |  | 대표 또는 책임자 이름 |
| director_phone | character varying | N |  | 대표 또는 책임자 연락처 |
| site_address | text | N |  | 현장 주소 |
| manager_id | uuid | N |  | FK -> `profiles.id` |
| company_type | text | N |  | 아파트인지 물류센터인지 종류 |
| start_date | bigint | N | `'0'::bigint` | 현장 시작일 |
| end_date | bigint | N | `'0'::bigint` | 현장 종료일 |
| business_registration_number | text | N |  | 사업자등록번호 |
| registration_month | date | N |  | 등록 월 |
| total_head_count | bigint | N |  | 현장 총헤드수 |
| site_completed | boolean | Y | `false` | 현장 종료 여부 |
| order_confirmed | boolean | Y | `true` | 수주 확정 여부, false면 수주예정으로 사용 |

## 작성 참고 메모
- 영업부 보고서에서 회사/현장 기준 데이터를 묶을 때 `company`, `place`, `company_type`, `registration_month`, `total_head_count`를 먼저 검토하는 것이 좋음
- `product_list`와 연결할 때는 문자열 매칭보다 `product_list.company_info -> company_list.id` 관계를 우선 사용하는 편이 안전함
- `start_date`, `end_date`는 bigint라서 실제 포맷을 한번 더 확인하고 화면 포맷팅 규칙을 정하는 편이 좋음
- 영업부 기준으로는 `order_confirmed = true`를 확정수주, `false`를 수주예정으로 해석 가능
- 영업부 기준으로는 `site_completed = true`를 종료 현장, `false`를 진행 현장으로 해석 가능
