# NiceEnTech Product

## 데스크톱 실행

```bash
npm install
npm run desktop:dev
```

## 데스크톱 빌드

```bash
npm run desktop:build
```

## 데스크톱 배포

이 프로젝트는 태그 push 시 GitHub Actions가 데스크톱 빌드 후 GitHub Release에 설치 파일을 올리도록 되어 있습니다.

배포 순서:

1. `package.json` 버전을 올립니다.
2. `package-lock.json` 버전도 같이 맞춥니다.
3. 커밋합니다.
4. 같은 버전으로 태그를 만듭니다.
5. 태그를 push 합니다.

예시:

```bash
git add .
git commit -m "release: v1.0.5"
git tag v1.0.5
git push origin main
git push origin v1.0.5
```

주의:

- 태그 버전과 `package.json` 버전이 다르면 Release 업로드가 실패합니다.
- Release에는 `exe`, `exe.blockmap`, `latest.yml` 파일이 올라가야 자동업데이트가 동작합니다.
