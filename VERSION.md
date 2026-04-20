# 버전 업데이트 방법

## 버전 위치

버전은 **`package.json`** 한 곳에서만 관리합니다.

```json
{
  "version": "1.0.7"
}
```

---

## 버전 번호 규칙 (Major.Minor.Patch)

| 자리 | 의미 | 예시 |
|------|------|------|
| Major | 전체 구조 변경, 대규모 개편 | `1.x.x → 2.0.0` |
| Minor | 새로운 기능 추가 | `1.0.x → 1.1.0` |
| Patch | 버그 수정, 소소한 개선 | `1.0.7 → 1.0.8` |

---

## 배포 절차

### 1. `package.json` 버전 수정
```json
"version": "1.0.8"
```

### 2. 빌드
```bash
npm run electron:build
```
`dist-electron/` 폴더에 설치 파일(`.exe`)이 생성됩니다.

### 3. Git 커밋 & 태그
```bash
git add package.json
git commit -m "v1.0.8"
git tag v1.0.8
git push && git push --tags
```

---

## 현재 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0.7 | - | 현재 |
