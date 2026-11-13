# SPMT Supabase 가이드

나이스엔테크와 SPMT는 Supabase 프로젝트 하나를 같이 쓴다. 화면은 회사별로 따로 만들고, 데이터는 테이블 이름으로 구분한다.

나중에 챗봇이 두 회사 데이터를 한 번에 검색할 수 있어야 한다. 그래서 SPMT 전용 스키마를 만들지 않고, 나이스엔테크와 같은 `public` 스키마에 둔다.

## 이름 규칙

SPMT가 새로 만드는 테이블, 뷰, 함수, 인덱스, RLS 정책, Storage 버킷은 이름 앞에 `spmt_`를 붙인다.

| 대상 | 규칙 | 예시 |
| --- | --- | --- |
| 테이블 | `spmt_` + 용도 | `spmt_company_list` |
| 뷰 | `spmt_` + 용도 | `spmt_quality_summary` |
| 함수 | `spmt_` + 동작 | `spmt_next_sort_value` |
| 인덱스 | `spmt_` + 테이블 + 컬럼 | `spmt_company_list_name_idx` |
| RLS 정책 | `spmt_` + 테이블 + 동작 | `spmt_company_list_select` |
| Storage 버킷 | `spmt_` + 용도 | `spmt_files` |

컬럼 이름에는 `spmt_`를 붙이지 않는다. 컬럼은 `snake_case`로 쓴다.

```text
spmt_quality_list
  id
  company
  place
  test_date
  created_at
```

나이스엔테크 테이블은 지금 이름 그대로 둔다. `quality_list`, `product_list` 같은 기존 테이블에 SPMT 행을 넣지 않는다.

## 같이 쓰는 것

아래는 프로젝트 공통이다. `spmt_`를 붙이지 않는다.

- `auth.users`
- `public.profiles`
- 챗봇 조회 역할 `chatbot_reader`
- 챗봇 함수 `chatbot_select`

SPMT 로그인 사용자도 같은 Auth와 `profiles`를 쓴다. SPMT 업무 데이터만 `spmt_` 테이블에 둔다.

## .env

SPMT 앱도 나이스엔테크 `.env`의 Supabase 접속 값을 그대로 쓴다. 프로젝트를 새로 만들거나 URL, 키를 따로 발급하지 않는다.

화면에서 쓰는 값:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

서버에서만 쓰는 값:

```text
SUPABASE_SERVICE_ROLE_KEY
```

값은 이 문서에 적지 않는다. 나이스엔테크 저장소의 `.env`를 복사해 SPMT 앱의 `.env`에 넣는다. `.env`는 git에 올리지 않는다.

`VITE_SUPABASE_URL`은 `https://joxfohziazjhscewifjj.supabase.co` 하나다. 이 주소가 다르면 테이블 이름이 `spmt_`여도 챗봇과 데이터가 연결되지 않는다.

SPMT 테이블이 나이스엔테크 업무 테이블을 참조하지 않는다. 필요한 참조는 `spmt_` 테이블끼리, 또는 `profiles`로 연결한다.

## 테이블을 만들 때

마이그레이션 파일 이름에도 회사를 표시한다.

```text
supabase/migrations/YYYYMMDD_spmt_company_list.sql
```

테이블마다 아래를 함께 넣는다.

1. `public.spmt_...` 테이블 생성
2. 조회에 쓸 인덱스
3. RLS 활성화
4. `authenticated` 권한과 정책
5. `chatbot_reader`의 `SELECT` 권한과 읽기 정책

`chatbot_reader` 권한을 빼면 나중에 챗봇이 그 테이블을 검색하지 못한다. 비밀번호, 토큰, 서명 키는 테이블에 넣지 않는다. 그런 값이 필요하면 챗봇 차단 목록에 테이블을 추가한다.

```sql
create table if not exists public.spmt_company_list (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists spmt_company_list_name_idx
  on public.spmt_company_list (name);

alter table public.spmt_company_list enable row level security;

grant select, insert, update, delete on public.spmt_company_list to authenticated;
grant usage, select on sequence public.spmt_company_list_id_seq to authenticated;

create policy spmt_company_list_select
  on public.spmt_company_list
  for select
  to authenticated
  using (true);

create policy spmt_company_list_insert
  on public.spmt_company_list
  for insert
  to authenticated
  with check (auth.uid() is not null);

create policy spmt_company_list_update
  on public.spmt_company_list
  for update
  to authenticated
  using (true)
  with check (true);

create policy spmt_company_list_delete
  on public.spmt_company_list
  for delete
  to authenticated
  using (true);

grant select on public.spmt_company_list to chatbot_reader;

drop policy if exists chatbot_reader_read on public.spmt_company_list;
create policy chatbot_reader_read
  on public.spmt_company_list
  for select
  to chatbot_reader
  using (true);
```

Realtime이 필요하면 `supabase_realtime` publication에 `spmt_` 테이블만 추가한다.

## 챗봇 검색

챗봇은 `public`의 테이블을 `SELECT`로 읽는다. 이름만 보고 회사를 구분한다.

- 접두사 없음: 나이스엔테크
- `spmt_`: SPMT

질문을 받을 때 회사가 정해져 있으면 해당 접두사 테이블만 조회한다. 전체 검색이면 두 종류를 같이 조회하고, 답변에 어느 회사 데이터인지 밝힌다.

## 만들지 말 것

- SPMT 전용 스키마
- 기존 나이스엔테크 테이블에 회사 구분 컬럼을 추가해 두 회사 행을 섞는 구조
- `spmt` 없이 새로 만드는 SPMT 업무 테이블
- 나이스엔테크 테이블 이름 앞에 `spmt_`를 소급해서 붙이는 변경
