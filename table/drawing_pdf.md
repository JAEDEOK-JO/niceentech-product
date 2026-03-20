# drawing_pdf 테이블 문서

## 수집 기준
- 수집 일시: 2026-03-20
- 수집 경로: Supabase MCP `list_tables` 라이브 조회
- 프로젝트: `joxfohziazjhscewifjj`

## 기본 정보
- 테이블명: `public.drawing_pdf`
- PK: `id`
- 연관:
  - `product_list_id` -> `product_list.id`

## 컬럼 목록

| 컬럼 | 타입 | Required | Default | 주석 |
|---|---|---:|---|---|
| id | bigint | Y | identity | PK |
| created_at | timestamptz | N | `now()` | 생성일시 |
| name | text | N |  | 파일명 |
| product_list_id | bigint | N |  | 연결된 `product_list.id` |
| nas_path | text | N |  | 스토리지 내부 경로 |
| url | text | N |  | 공개 URL |
| storage_url | text | N |  | 스토리지 URL |

## 현재 앱 사용 방식
- 조회: `product_list.id` 기준으로 `drawing_pdf`를 조회
- 업로드: 파일을 Supabase Storage `media` 버킷에 업로드한 뒤, `drawing_pdf`에 메타데이터 저장
- 삭제: `drawing_pdf` 레코드 삭제 + Storage 파일 삭제
