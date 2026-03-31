# product_list 테이블 문서

## 수집 기준
- 수집 일시: 2026-03-10
- 수집 경로: Supabase MCP `execute_sql` 라이브 조회
- 프로젝트: `joxfohziazjhscewifjj`
- 주의: 데이터 변경/삭제 없이 메타데이터만 재확인

## 기본 정보
- 테이블명: `public.product_list`
- PK: `id`
- 주요 연관:
  - `company_info` -> `company_list.id`
  - `outsourcing_company_id` -> `outsourcing_company.id`
  - `drawing_pdf.product_list_id`로 앱에서 도면 연결

## 제약 / 인덱스 / 트리거

### 제약조건
- `product_list_pkey`: PRIMARY KEY (`id`)
- `product_list_company_info_fkey`: FOREIGN KEY (`company_info`) REFERENCES `company_list(id)` ON DELETE SET NULL
- `product_list_outsourcing_company_id_fkey`: FOREIGN KEY (`outsourcing_company_id`) REFERENCES `outsourcing_company(id)` ON DELETE SET NULL

### 인덱스
- `product_list_pkey`: UNIQUE BTREE (`id`)
- `idx_product_list_company_info`: BTREE (`company_info`)
- `idx_product_list_company_place`: BTREE (`company`, `place`)
- `idx_product_list_outsourcing`: BTREE (`outsourcing`)
- `idx_product_list_outsourcing_company`: BTREE (`outsourcing_company_id`)

### 트리거
- `on_product_list_update`: BEFORE UPDATE -> `update_shipment_timestamps()`
- `product_list_changes_trigger`: AFTER INSERT/DELETE/UPDATE -> `notify_product_list_changes()`
- `trigger_drawing_completion`: AFTER UPDATE -> `check_drawing_completion_simple()`
- `product_list_drawing_telegram_trigger`: AFTER INSERT OR UPDATE OF drawing_date -> `enqueue_drawing_telegram_notification()` (drawing_date timestamptz 변경 감지)

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y |  | PK |
| created_at | timestamp with time zone | N | `now()` | 생성일시 |
| company | text | N |  | 회사명 |
| place | text | N |  | 현장명 |
| area | text | N |  | 구역명 |
| hole | bigint | N | `'0'::bigint` | 홀 수량 |
| head | bigint | N | `'0'::bigint` | 가지관 헤드 수량 |
| memo | text | N | `''::text` | 비고 메모 |
| initial | text | N |  | 도번 |
| test_date | text | N |  | 검수날짜, 주간 조회 기준 |
| updated_at | timestamp with time zone | N | `now()` | 수정일시 |
| groove | bigint | N | `'0'::bigint` | 그루브 수량 |
| work_type | text | N |  | 용접/무용접, 전실/입상, 나사, 기타 |
| uid | uuid | N |  | 담당 사용자 ID |
| name | text | N |  | 담당자명 |
| paper | boolean | N | `false` | 서류 유무 |
| drawing | boolean | N | `false` | 도면 유무 |
| drawing_date | timestamp with time zone | N |  | 도면배포일자 (timestamptz, UI에서 YY.MM.DD로 표시) |
| shipment_date | text | N |  | 출하일자 |
| delivery_due_date | date | N |  | 현장 납기일 |
| sales_date | text | N |  | 매출일자 |
| sales_amount | numeric | N |  | 행별 매출 입력 금액 |
| not_test | boolean | N | `false` | 검사 제외 여부 |
| is_drawing | boolean | N | `false` | 도면 완료 여부 |
| weight | double precision | N |  | 중량, 합계 계산 사용 |
| worker_t | text | N | `'없음'::text` | T공정 담당 상태 |
| worker_nasa | text | N | `'없음'::text` | 나사공정 담당 상태 |
| worker_welding | text | N | `'없음'::text` | 용접공정 담당 상태 |
| complete | boolean | N | `false` | 완료 여부 |
| hold | boolean | N | `false` | 보류 여부 |
| shipment | boolean | N | `false` | 출하 여부 |
| calculation | boolean | N | `false` | 계산 반영 여부 |
| product_list | boolean | N | `false` | 생산계획표 반영 여부 |
| no | bigint | N | `'1000'::bigint` | 정렬 기준 |
| ahn | boolean | N | `false` | 안차장님 체크 여부 |
| worker_t_time | text | N |  | T공정 처리시간 |
| worker_nasa_time | text | N |  | 나사공정 처리시간 |
| worker_welding_time | text | N |  | 용접공정 처리시간 |
| worker_t_time_final | text | N |  | T공정 최종시간 |
| worker_nasa_time_final | text | N |  | 나사공정 최종시간 |
| worker_welding_time_final | text | N |  | 용접공정 최종시간 |
| company_info | bigint | N |  | FK -> `company_list.id` |
| stamp | boolean | N | `false` | 도장/스탬프 여부 |
| worker_main_time | text | N | `''::text` | 메인공정 처리시간 |
| worker_main_time_final | text | N | `''::text` | 메인공정 최종시간 |
| worker_main | text | N | `''::text` | 메인공정 담당 상태 |
| outsourcing_company_id | bigint | N |  | FK -> `outsourcing_company.id` |
| outsourcing | boolean | N | `false` | 외주 여부 |
| full_text | text | N |  | 검색용 통합 텍스트 |
| marking_status | text | Y | `'작업전'::text` | 마킹 상태 |
| cutting_status | text | Y | `'작업전'::text` | 절단 상태 |
| beveling_status | text | Y | `'작업전'::text` | 티&면치 상태 |
| main_status | text | Y | `'작업전'::text` | 메인 상태 |
| delay_time | bigint | N | `'0'::bigint` | 지연시간(초) |
| delay_text | text | N |  | 지연 사유 |
| marking_weld_a_status | text | Y | `'작업전'::text` | 마킹1 상태 |
| marking_weld_b_status | text | Y | `'작업전'::text` | 마킹2 상태 |
| marking_laser_1_status | text | Y | `'작업전'::text` | 레이저1 상태 |
| marking_laser_2_status | text | Y | `'작업전'::text` | 레이저2 상태 |
| nasa_status | text | Y | `'작업전'::text` | 무용접 상태 |
| virtual_drawing_distributed | boolean | Y | `false` | 가상도면배포 여부 |
| complete_date | text | Y | `''::text` | 완료일자(`MM.DD` 형식 사용 중) |
| marking_weld_a_started_on | date | N |  | 마킹1 시작일 |
| marking_weld_a_completed_on | date | N |  | 마킹1 완료일 |
| marking_weld_b_started_on | date | N |  | 마킹2 시작일 |
| marking_weld_b_completed_on | date | N |  | 마킹2 완료일 |
| marking_laser_1_started_on | date | N |  | 레이저1 시작일 |
| marking_laser_1_completed_on | date | N |  | 레이저1 완료일 |
| marking_laser_2_started_on | date | N |  | 레이저2 시작일 |
| marking_laser_2_completed_on | date | N |  | 레이저2 완료일 |
| beveling_started_on | date | N |  | 티&면치 시작일 |
| beveling_completed_on | date | N |  | 티&면치 완료일 |
| main_started_on | date | N |  | 메인 시작일 |
| main_completed_on | date | N |  | 메인 완료일 |
| nasa_started_on | date | N |  | 무용접 시작일 |
| nasa_completed_on | date | N |  | 무용접 완료일 |

## 앱 연동 메모
- 홈 생산계획/스케줄카드/통계는 `test_date` 기준으로 `product_list`를 직접 조회해서 집계함
- 공정 상태 통계는 `marking_*`, `beveling_status`, `main_status`, `nasa_status`, `complete`, `complete_date`를 주로 사용함
- 관리자용 가이드/대시보드에서도 `product_list`에서 가져올 수 있는 값은 우선 재사용하는 방향이 적합함
- 별도 입력이 필요한 값만 추가 테이블로 분리하고, `company/place/test_date/출하/매출/지연`처럼 이미 `product_list`에 있는 값은 중복 저장하지 않는 편이 좋음
