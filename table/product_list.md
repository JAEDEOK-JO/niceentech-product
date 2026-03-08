# product_list 테이블 문서

## 수집 기준
- 수집 일시: 2026-02-23
- 수집 경로: Supabase MCP (`list_projects`, `list_tables`, `execute_sql`)
- 프로젝트: `joxfohziazjhscewifjj`

## 기본 정보
- 테이블명: `public.product_list`
- Primary Key: `id` (OpenAPI description 기준)
- Foreign Key:
  - `company_info` -> `company_list.id`
  - `outsourcing_company_id` -> `outsourcing_company.id`
- 도면 연관(업무 연계):
  - `drawing_pdf.product_list_id`로 `product_list.id`를 참조해 도면 PDF를 연결
  - DB FK 제약은 없고, 앱 로직에서 조회 연계

## 트리거 / 제약사항
- 제약(Constraints):
  - `product_list_pkey` (PRIMARY KEY): `id`
  - `product_list_company_info_fkey` (FOREIGN KEY): `company_info` -> `company_list.id`
  - `product_list_outsourcing_company_id_fkey` (FOREIGN KEY): `outsourcing_company_id` -> `outsourcing_company.id`
  - `2200_18351_1_not_null` (CHECK): `id IS NOT NULL`
- 인덱스(Indexes):
  - `product_list_pkey` (UNIQUE INDEX on `id`)
  - `idx_product_list_company_info` (btree `company_info`)
  - `idx_product_list_company_place` (btree `company, place`)
  - `idx_product_list_outsourcing` (btree `outsourcing`)
  - `idx_product_list_outsourcing_company` (btree `outsourcing_company_id`)
- 트리거(Triggers):
  - `on_product_list_update` (BEFORE UPDATE): `update_shipment_timestamps()`
  - `product_list_changes_trigger` (AFTER INSERT/UPDATE/DELETE): `notify_product_list_changes()`
  - `trigger_drawing_completion` (AFTER UPDATE): `check_drawing_completion_simple()`

## 컬럼 목록

> 작성 규칙: 마지막 컬럼(`주석`)에 업무 용어로 간단히 적기  
> 예) `company = 회사명`, `place = 현장명`

| 컬럼 | 타입(format) | Required | Default | 주석 |
|---|---|---:|---|---|
| id | integer (bigint) | Y |  | PK |
| created_at | string (timestamp with time zone) | N | now() | 생성일시 |
| company | string (text) | N |  | 회사명 |
| place | string (text) | N |  | 현장명 |
| area | string (text) | N |  | 구역명 |
| hole | integer (bigint) | N | `'0'::bigint` | 홀 수량 |
| head | integer (bigint) | N | `'0'::bigint` | 헤드 수량 |
| memo | string (text) | N | `''::text` | 비고 메모 |
| initial | string (text) | N |  | 도번 |
| test_date | string (text) | N |  | 필터 기준으로 사용 중(검수일짜) |
| updated_at | string (timestamp with time zone) | N | now() | 수정일시 |
| groove | integer (bigint) | N | `'0'::bigint` | 그루브 수량 |
| work_type | string (text) | N |  | 용접/무용접, 전실/입상, 나사, 기타 |
| uid | string (uuid) | N |  | 담당 사용자 ID |
| name | string (text) | N |  | 담당자명 |
| paper | boolean (boolean) | N | false | 서류 유무 |
| drawing | boolean (boolean) | N | false | 도면 유무(도면 칸 표시와 연계) |
| drawing_date | string (text) | N |  | 도면배포일자 |
| virtual_drawing_distributed | boolean (boolean) | N | false | 가상도면배포 여부(시뮬레이션) |
| shipment_date | string (text) | N |  | 출하일자 |
| sales_date | string (text) | N |  | 매출일자 |
| not_test | boolean (boolean) | N | false | 검사 제외 여부 |
| is_drawing | boolean (boolean) | N | false | 도면 완료 여부 |
| weight | number (double precision) | N |  | 합계 계산 사용 |
| worker_t | string (text) | N | `'없음'::text` | T공정 담당 상태 |
| worker_nasa | string (text) | N | `'없음'::text` | 나사공정 담당 상태 |
| worker_welding | string (text) | N | `'없음'::text` | 용접공정 담당 상태 |
| complete | boolean (boolean) | N | false | 완료 여부 |
| hold | boolean (boolean) | N | false | 보류 여부 |
| shipment | boolean (boolean) | N | false | 출하 여부 |
| calculation | boolean (boolean) | N | false | 계산 반영 여부 |
| product_list | boolean (boolean) | N | false | 생산계획표 반영 여부 |
| no | integer (bigint) | N | `'1000'::bigint` | 정렬 기준으로 사용 중 |
| ahn | boolean (boolean) | N | false | 안차장님 체크 여부 |
| worker_t_time | string (text) | N |  | T공정 처리시간 |
| worker_nasa_time | string (text) | N |  | 나사공정 처리시간 |
| worker_welding_time | string (text) | N |  | 용접공정 처리시간 |
| worker_t_time_final | string (text) | N |  | T공정 최종시간 |
| worker_nasa_time_final | string (text) | N |  | 나사공정 최종시간 |
| worker_welding_time_final | string (text) | N |  | 용접공정 최종시간 |
| company_info | integer (bigint) | N |  | FK -> company_list.id |
| stamp | boolean (boolean) | N | false | 도장/스탬프 여부 |
| worker_main_time | string (text) | N | `''::text` | 메인공정 처리시간 |
| worker_main_time_final | string (text) | N | `''::text` | 메인공정 최종시간 |
| worker_main | string (text) | N | `''::text` | 메인공정 담당 상태 |
| outsourcing_company_id | integer (bigint) | N |  | FK -> outsourcing_company.id |
| outsourcing | boolean (boolean) | N | false | 외주 여부 |
| full_text | string (text) | N |  | 검색용 통합 텍스트 |
| marking_status | string (text) | Y | `'작업전'::text` | 마킹 상태(작업전/작업중/작업완료) |
| marking_weld_a_status | string (text) | Y | `'작업전'::text` | 마킹1 상태(용접/무용접 25,32) |
| marking_weld_b_status | string (text) | Y | `'작업전'::text` | 마킹2 상태(용접/무용접 40,50,65) |
| marking_laser_1_status | string (text) | Y | `'작업전'::text` | 레이저1 상태(전실/입상 65,80,100) |
| marking_laser_2_status | string (text) | Y | `'작업전'::text` | 레이저2 상태(전실/입상 100,125,150,200) |
| cutting_status | string (text) | Y | `'작업전'::text` | 절단 상태(작업전/작업중/작업완료) |
| beveling_status | string (text) | Y | `'작업전'::text` | 생산 상태(작업전/작업중/작업완료) |
| main_status | string (text) | Y | `'작업전'::text` | 메인 상태(작업전/작업중/작업완료) |
| nasa_status | string (text) | Y | `'작업전'::text` | 무용접 상태(작업전/작업중/작업완료) |
| marking_weld_a_started_on | string (date) | N |  | 마킹1 작업 시작일 |
| marking_weld_a_completed_on | string (date) | N |  | 마킹1 작업 완료일 |
| marking_weld_b_started_on | string (date) | N |  | 마킹2 작업 시작일 |
| marking_weld_b_completed_on | string (date) | N |  | 마킹2 작업 완료일 |
| marking_laser_1_started_on | string (date) | N |  | 레이저1 작업 시작일 |
| marking_laser_1_completed_on | string (date) | N |  | 레이저1 작업 완료일 |
| marking_laser_2_started_on | string (date) | N |  | 레이저2 작업 시작일 |
| marking_laser_2_completed_on | string (date) | N |  | 레이저2 작업 완료일 |
| beveling_started_on | string (date) | N |  | 티&면치 작업 시작일 |
| beveling_completed_on | string (date) | N |  | 티&면치 작업 완료일 |
| main_started_on | string (date) | N |  | 메인 작업 시작일 |
| main_completed_on | string (date) | N |  | 메인 작업 완료일 |
| nasa_started_on | string (date) | N |  | 무용접 작업 시작일 |
| nasa_completed_on | string (date) | N |  | 무용접 작업 완료일 |
