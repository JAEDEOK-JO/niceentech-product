# 릴리즈 / 버전업 절차

사용자가 "버전업해줘"라고 요청하면 아래 순서로 진행한다.

## Supabase 배포 원칙

**반드시 이 순서를 지킨다.**

1. **Supabase Storage `update` 버킷 업로드** (exe, blockmap, latest.yml)
2. 업로드 완료 및 `latest.yml` 버전 확인
3. **`public.setting.version` 업데이트**

`setting.version`을 먼저 올리지 않는다. 웹 사용자가 새로고침했을 때 데스크톱 설치 파일이 아직 없으면 업데이트가 깨질 수 있다.

## 1. 현재 상태 확인

```powershell
git status --short --branch
git log -5 --oneline
```

- 작업 트리에 변경사항이 있으면 버전업 릴리즈 커밋에 모두 포함한다.
- 단, `release/`, `dist/`, `dist-electron/` 같은 빌드 산출물은 커밋하지 않는다.
- 관련 없는 미커밋 파일은 되돌리지 않는다.

## 2. 버전 올리기

현재 버전을 확인한다.

```powershell
npm pkg get version
```

패치 버전업은 다음 명령을 사용한다.

```powershell
npm version patch --no-git-tag-version
```

이 명령은 `package.json`, `package-lock.json`의 버전을 함께 올린다.

## 3. 빌드 검증

일반 Vue 빌드 검증:

```powershell
npm run build
```

데스크톱 릴리즈 산출물 생성:

```powershell
npm run desktop:publish
```

`desktop:publish`는 GitHub Actions 릴리즈 워크플로우에서도 사용한다. 산출물은 `release/` 아래에 생성된다.

필수 파일:

- `release/latest.yml`
- `release/NICEENTECH Setup <version>.exe`
- `release/NICEENTECH Setup <version>.exe.blockmap`

## 4. 릴리즈 커밋

현재 변경사항을 모두 스테이징한다.

```powershell
git add .
git commit -m "<version> 버전업"
```

예:

```powershell
git commit -m "1.3.25 버전업"
```

커밋 후 바로 원격에 푸시한다.

```powershell
git push origin main
```

## 5. GitHub 업로드

태그를 만들고 `main`, 태그를 푸시한다.

```powershell
git tag v<version>
git push origin main
git push origin v<version>
```

예:

```powershell
git tag v1.3.25
git push origin main
git push origin v1.3.25
```

원격 태그 확인:

```powershell
git ls-remote --tags origin v<version>
```

태그 푸시 후 `.github/workflows/desktop-release.yml`이 GitHub Release를 생성한다. 이 워크플로우는 태그 버전과 `package.json` 버전이 같아야 성공한다.

## 6. Supabase Storage 업로드

Supabase CLI 인증을 확인한다.

```powershell
Remove-Item Env:SUPABASE_ACCESS_TOKEN -ErrorAction SilentlyContinue
supabase projects list
```

`Unauthorized`가 나오면 위처럼 잘못된 `SUPABASE_ACCESS_TOKEN` 환경변수를 먼저 제거한다. 그래도 안 되면 로그인한다.

```powershell
supabase login --token "<token>"
```

프로젝트 링크를 맞춘다.

```powershell
supabase link --project-ref joxfohziazjhscewifjj
```

`update` 버킷에 업로드한다. `<version>`은 실제 버전으로 바꾼다.

```powershell
supabase --experimental storage cp --cache-control "public, max-age=31536000" ".\release\NICEENTECH Setup <version>.exe" "ss:///update/NICEENTECH Setup <version>.exe"
supabase --experimental storage cp --cache-control "public, max-age=31536000" ".\release\NICEENTECH Setup <version>.exe.blockmap" "ss:///update/NICEENTECH Setup <version>.exe.blockmap"
```

`latest.yml`은 기존 파일이 있으면 중복 오류가 나므로 삭제 후 다시 올린다.

```powershell
'y' | supabase --experimental storage rm "ss:///update/latest.yml"
supabase --experimental storage cp --cache-control "no-cache" ".\release\latest.yml" "ss:///update/latest.yml"
```

공개 URL로 확인한다.

```text
https://joxfohziazjhscewifjj.supabase.co/storage/v1/object/public/update/latest.yml
```

내용의 `version`이 새 버전인지 확인한 뒤에만 다음 단계로 넘어간다.

## 7. Supabase setting 테이블 업데이트

**6단계 Storage 업로드가 끝난 뒤에** `public.setting.version`을 올린다.

웹 클라이언트는 이 값을 기준으로 새 버전 배포 여부를 판단한다.

```sql
update public.setting
set version = '<version>'
returning version, update_message;
```

검증:

```sql
select version, update_message
from public.setting
limit 5;
```

## 8. 최종 확인

```powershell
git status --short --branch
```

확인할 것:

- `main`이 `origin/main`과 동기화되어 있는지
- `v<version>` 태그가 원격에 있는지
- Supabase Storage 업로드가 **먼저** 끝났는지
- `latest.yml` 공개 URL이 새 버전을 가리키는지
- 그 **다음에** `public.setting.version`이 새 버전인지
- 빌드 산출물을 제외한 변경사항이 릴리즈 커밋에 모두 포함됐는지

## 주의

- Supabase access token은 채팅이나 로그에 노출되면 사용 후 삭제 또는 재발급을 권장한다.
- `release/`, `dist/`, `dist-electron/` 산출물은 일반적으로 git에 커밋하지 않는다.
- 관련 없는 작업 파일은 절대 되돌리지 않는다.
