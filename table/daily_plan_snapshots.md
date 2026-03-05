# daily_plan_snapshots 테이블 문서

## 목적
- 자정 기준(스케줄러)으로 `일일목표/완료/총수량/잔여/야근` 스냅샷을 저장
- 실시간 계산값과 분리된 요일별 통계 이력 보관

## 컬럼

| 컬럼 | 타입 | Required | Default | 설명 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| snapshot_date | date | Y |  | 기록 기준 날짜(유니크) |
| test_date | text | Y |  | 집계 대상 `product_list.test_date` 포맷(`YYYY년 MM월 DD일`) |
| weekday | text | Y |  | 요일 (`월`~`일`) |
| daily_target_head | integer | Y | 0 | 일일 목표 수량 |
| completed_head | integer | Y | 0 | 완료 수량 |
| total_head | integer | Y | 0 | 총 수량(배포/가상배포 기준) |
| remaining_head | integer | Y | 0 | 잔여 수량 |
| today_overtime_sec | integer | Y | 0 | 오늘 야근(초) |
| weekly_overtime_sec | integer | Y | 0 | 주간 야근(초) |
| distributed_drawing_count | integer | Y | 0 | 배포된 도면 개수 |
| total_drawing_count | integer | Y | 0 | 전체 도면 개수 |
| created_at | timestamptz | Y | now() | 생성시각 |
| updated_at | timestamptz | Y | now() | 수정시각 |

## 집계 규칙
- 배포 도면: `drawing_date` 존재 또는 `virtual_drawing_distributed = true`
- 완료 판정: 공정 상태값이 `작업완료` 또는 `없음`
- 요일/야근 계산은 앱 로직과 동일 기준을 사용

## 스케줄러
- SQL 파일: `sql/daily_plan_snapshots_scheduler.sql`
- 기본 스케줄: 매일 KST 00:01 저장(UTC 15:01)
