# department_metric_entries 테이블 문서

## 기본 정보
- 테이블명: `public.department_metric_entries`
- 용도: 부서별 기간 입력값 저장
- 현재 사용 형태: 영업부 `weekly` 주간 입력

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| department_code | text | Y |  | 부서 코드 |
| metric_key | text | Y |  | 지표 키 |
| period_type | text | Y |  | 현재는 `weekly` 사용 |
| period_start_date | date | Y |  | 기간 시작일 |
| period_end_date | date | Y |  | 기간 종료일 |
| numeric_value | numeric | N |  | 숫자 지표 저장 |
| text_value | text | Y | `''` | 메모/텍스트 지표 저장 |
| note | text | N |  | 추가 메모 |
| created_by | uuid | N |  | 입력 사용자, `profiles.id` 참조 |
| created_at | timestamptz | Y | `now()` | 생성일시 |
| updated_at | timestamptz | Y | `now()` | 수정일시 |

## 제약 / 인덱스
- Unique: `(department_code, metric_key, period_type, period_start_date)`
- FK: `(department_code, metric_key)` -> `department_metric_definitions`
- FK: `created_by` -> `profiles.id`
- Index: `department_code, period_type, period_start_date desc`

## 입력 규칙
- 숫자 지표는 `numeric_value`
- 텍스트 지표는 `text_value`
- 같은 부서/지표/기간 시작일 조합은 `upsert`로 갱신
