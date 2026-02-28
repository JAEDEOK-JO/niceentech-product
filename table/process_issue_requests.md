# 공정 이슈 요청/알림 테이블 문서

## 개요
- 목적: 메뉴 다이얼로그의 `도면없음`, `증지없음` 요청을 DB에 기록하고 담당자별 알림으로 전달
- 적용 일시: 2026-02-25
- 적용 방식: Supabase MCP `apply_migration`

## 1) 요청 본문 테이블

### 테이블명
- `public.process_issue_requests`

### 컬럼
| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| created_at | timestamptz | Y | now() | 생성일시 |
| updated_at | timestamptz | Y | now() | 수정일시 |
| product_list_id | bigint | Y |  | FK -> `product_list.id` |
| request_type | text | Y |  | `도면없음`, `증지없음`, `기타` |
| request_status | text | Y | `요청` | `요청`, `확인중`, `처리완료`, `반려` |
| request_message | text | Y | `''` | 상세 요청 내용 |
| requester_user_id | uuid | N |  | 요청자(`profiles.id`) |
| requester_name | text | Y | `''` | 요청자 이름 스냅샷 |
| requester_work_man | text | Y | `'없음'` | 요청자 공정/라인 스냅샷 |
| target_work_mans | text[] | Y | `{}` | 알림 대상 라인 목록(예: `{마킹1,티&면치}`) |
| company | text | Y | `''` | 회사명 스냅샷 |
| place | text | Y | `''` | 현장명 스냅샷 |
| area | text | Y | `''` | 구역명 스냅샷 |
| test_date | text | Y | `''` | 검수날짜 스냅샷 |
| is_urgent | boolean | Y | `false` | 긴급 여부 |
| resolved_at | timestamptz | N |  | 처리완료/반려 시각 |
| resolved_by_user_id | uuid | N |  | 처리자(`profiles.id`) |
| resolved_note | text | Y | `''` | 처리 메모 |

### 인덱스
- `idx_process_issue_requests_product_list_id`
- `idx_process_issue_requests_status`
- `idx_process_issue_requests_test_date`
- `idx_process_issue_requests_created_at`

### 제약
- `request_type` CHECK
- `request_status` CHECK
- `product_list_id` FK (`ON DELETE CASCADE`)

---

## 2) 담당자별 알림 테이블

### 테이블명
- `public.process_issue_request_notifications`

### 컬럼
| 컬럼 | 타입 | 필수 | 기본값 | 설명 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| created_at | timestamptz | Y | now() | 생성일시 |
| request_id | bigint | Y |  | FK -> `process_issue_requests.id` |
| recipient_user_id | uuid | Y |  | 알림 수신자(`profiles.id`) |
| recipient_work_man | text | Y | `'없음'` | 수신자 라인 스냅샷 |
| title | text | Y |  | 알림 제목 |
| message | text | Y |  | 알림 본문 |
| is_read | boolean | Y | `false` | 읽음 여부 |
| read_at | timestamptz | N |  | 읽은 시각 |

### 인덱스/제약
- `idx_process_issue_notifications_recipient`
- `idx_process_issue_notifications_request_id`
- `unique (request_id, recipient_user_id)`

---

## 3) 권장 저장 예시
- 요청자: `마킹1`
- 요청유형: `도면없음`
- 저장 메시지 예:
  - 제목: `[도면없음] 대진공무/디에트르/A구역`
  - 본문: `마킹1 요청 · 검수날짜 2026년 01월 01일 · 도면이 없어 작업 대기`

---

## 4) 다음 구현 단계
- 메뉴 다이얼로그에서 요청 생성 시:
  1. `process_issue_requests` insert
  2. 대상 라인/관리자에게 `process_issue_request_notifications` bulk insert
- 홈/마이페이지에서:
  - 내 알림 미확인 카운트 표시
  - 클릭 시 요청 상세(`회사/현장/구역/검수날짜/요청자/요청내용`) 확인
