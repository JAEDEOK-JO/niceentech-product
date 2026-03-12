# department_metric_definitions 테이블 문서

## 기본 정보
- 테이블명: `public.department_metric_definitions`
- 용도: 부서별 입력/집계 지표 정의
- 주요 사용 부서: `sales`, `design`, `operations`, `production`

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| department_code | text | Y |  | 부서 코드 |
| metric_key | text | Y |  | 지표 키 |
| label | text | Y |  | 화면 표시명 |
| value_type | text | Y |  | `number` / `percent` / `text` / `currency` |
| unit | text | Y | `''` | 단위 |
| sort_order | integer | Y | `0` | 화면 정렬 순서 |
| is_active | boolean | Y | `true` | 사용 여부 |
| created_at | timestamptz | Y | `now()` | 생성일시 |
| updated_at | timestamptz | Y | `now()` | 수정일시 |

## 제약 / 인덱스
- Unique: `(department_code, metric_key)`
- Index: `department_code, sort_order`

## 초기 데이터
- 현재 `sales` 부서 영업부 주간 지표 8개가 입력되어 있음
