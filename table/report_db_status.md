# 보고서 DB 연동 현황

## 요약

현재 관리가이드의 부서별 대표 보고서가 전부 동일한 수준으로 DB화된 것은 아니지만, 직접 입력하는 보고서 항목은 `Supabase` 저장 기준으로 정리되고 있습니다.

| 부서 | 화면 파일 | 현재 저장 방식 | 상태 |
|---|---|---|---|
| 영업부 | `src/features/management-guide/SalesExecutiveReportExampleView.vue` | `Supabase` 읽기/쓰기 | DB화 완료 |
| 설계부 | `src/features/management-guide/DesignExecutiveReportExampleView.vue` | `Supabase` 읽기 전용 | 부분 DB화 |
| 생산부 | `src/features/management-guide/ProductionExecutiveReportExampleView.vue` | `Supabase` 읽기/쓰기 | DB화 완료 |
| 공무부 | `src/features/management-guide/OperationsExecutiveReportExampleView.vue` | `Supabase` 읽기/쓰기 | DB화 완료 |

## 부서별 상세

### 1. 영업부

- 사용 테이블
  - `company_list`
  - `sales_weekly_entries`
  - `sales_as_entries`
- 저장소
  - 이미지 파일은 `Supabase Storage` `media` 버킷 사용
- 현재 동작
  - 월별 매출 조회
  - 주차별 매출 입력/수정/삭제
  - AS 목록 조회
  - AS 입력/수정/삭제
  - 회사 검색 연동
- 판단
  - 영업부 보고서는 `Supabase` 기준으로 실데이터 저장/조회가 되는 상태

### 2. 설계부

- 사용 테이블
  - `product_list`
- 현재 동작
  - `product_list` 데이터를 읽어와서
  - 도면 배포 현황
  - 산출 완료율
  - 납기 위험
  - 목요일 12시 배포율
  - 납기 준수율
  - 미배포 / 지연 배포 목록
    등을 화면에서 계산
- 현재 한계
  - 설계부 보고서 전용 입력 테이블 없음
  - 설계부 보고서 전용 `insert / update / delete` 없음
- 판단
  - 원천 데이터는 DB에 있지만, 설계부 보고서 자체가 별도 테이블로 완전 분리된 상태는 아님

### 3. 생산부

- 사용 테이블
  - `product_list`
  - `production_repair_history`
- 현재 동작
  - `product_list` 기준 생산 실적/카테고리 집계 조회
  - `production_repair_history` 기준 수리내역 조회
  - 수리내역 입력/수정/삭제 가능
- 판단
  - 생산부 보고서는 `Supabase` 읽기/쓰기까지 연결된 상태

### 4. 공무부

- 사용 테이블
  - `department_metric_definitions`
  - `department_metric_entries`
- 현재 동작
  - 입고 / 사용 / 총 잔고 입력
  - 오제작 / 누락분 입력, 수정, 삭제
  - 진민택 / 민뚜라 비교 자동 계산
- 판단
  - 공무부 보고서도 이제 `Supabase` 기준으로 직접 입력 / 조회가 되는 상태

## 결론

- `영업부`, `생산부`, `공무부`: DB화됨
- `설계부`: DB 조회 기반이지만 보고서 전용 저장 구조는 없음

## 참고 파일

- `src/features/management-guide/SalesExecutiveReportExampleView.vue`
- `src/features/management-guide/DesignExecutiveReportExampleView.vue`
- `src/features/management-guide/ProductionExecutiveReportExampleView.vue`
- `src/features/management-guide/OperationsExecutiveReportExampleView.vue`
