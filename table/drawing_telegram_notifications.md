# drawing_telegram_notifications 테이블 문서

## 목적
- `product_list.drawing_date`가 바뀔 때 텔레그램 알림 요청 이력을 저장합니다.
- 기본은 저장 직후 Postgres `http` 확장으로 즉시 전송합니다.
- 즉시 전송 실패 시 재시도 함수가 실패 건을 다시 전송합니다.

## 동작 기준
- `drawing_date`: NULL -> 값 있음 (timestamptz)
  - 메시지: `회사명 현장명 구역명 도면배포`
- `drawing_date`: 값 있음 -> NULL
  - 메시지: `회사명 현장명 구역명 도면배포 취소`
- `drawing_date`: 값 있음 -> 다른 값
  - 메시지: `회사명 현장명 구역명 도면배포`

## 테이블명
- `public.drawing_telegram_notifications`

## 컬럼
| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | bigint | PK |
| product_list_id | bigint | `product_list.id` |
| event_type | text | `distributed` / `cancelled` |
| company | text | 회사명 |
| place | text | 현장명 |
| area | text | 구역명 |
| drawing_date | text | 변경 후 `drawing_date` (YY.MM.DD 포맷 텍스트로 저장) |
| previous_drawing_date | text | 변경 전 `drawing_date` (YY.MM.DD 포맷 텍스트로 저장) |
| message | text | 실제 전송 메시지 |
| request_id | bigint | 초기 비동기 구조 호환용, 현재는 거의 미사용 |
| delivery_status | text | `queued` / `skipped` / `sent` / `failed` |
| skip_reason | text | 미전송 사유 |
| attempt_count | integer | 전송 시도 횟수 |
| sent_at | timestamptz | 실제 전송 성공 시각 |
| last_error | text | 마지막 오류 메시지 |
| response_status_code | integer | 텔레그램 HTTP 응답 코드 |
| response_body | text | 텔레그램 응답 본문 |
| created_at | timestamptz | 생성 시각 |
| updated_at | timestamptz | 마지막 상태 갱신 시각 |

## 현재 처리 방식
- 트리거: `product_list.drawing_date` (timestamptz) 변경 감지 (`IS NOT DISTINCT FROM` 비교)
- 1차 처리: 알림 이력 insert 후 즉시 텔레그램 전송
- 실패 시: `retry_drawing_telegram_notifications` 크론 작업이 15초마다 재시도
- 재시도 최대 횟수: 5회

## 초기 설정 필요
- Vault 시크릿 2개가 필요합니다.
- 처음 마이그레이션 시 아래 이름으로 placeholder 가 자동 생성됩니다.
  - `telegram_bot_token`
  - `telegram_chat_id`

## 실제 값 넣기
아래 SQL 중 해당하는 방식으로 값만 바꾸면 됩니다.

```sql
select vault.update_secret(
  (select id from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1),
  '<텔레그램_봇_토큰>',
  'telegram_bot_token',
  'Telegram bot token for drawing_date notifications'
);

select vault.update_secret(
  (select id from vault.decrypted_secrets where name = 'telegram_chat_id' limit 1),
  '<텔레그램_chat_id>',
  'telegram_chat_id',
  'Telegram chat id for drawing_date notifications'
);
```

## 확인용 조회
```sql
select
  id,
  product_list_id,
  event_type,
  message,
  delivery_status,
  attempt_count,
  response_status_code,
  last_error,
  skip_reason,
  sent_at,
  created_at
from public.drawing_telegram_notifications
order by id desc
limit 50;
```

```sql
select public.retry_failed_drawing_telegram_notifications(20);
```
