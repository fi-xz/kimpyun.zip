# kimpyun.zip

스트리머 김편집의 비공식 링크 모음 사이트 [kimpyun.zip](https://kimpyun.zip) 의 소스입니다.

- **사이트** — React + Vite 정적 사이트. Cloudflare Pages 로 배포합니다.
- **단축 URL** — `kimpyun.zip/chzzk` 같은 경로를 처리하는 Cloudflare Worker(`worker/`).
  단축 URL 목록은 `src/data/shortlinks.ts` 한 곳에서 관리합니다.

## 빌드

Node 22.18 이상과 pnpm(`packageManager` 에 지정된 버전)이 필요합니다.

```sh
pnpm install
pnpm dev      # 로컬 개발 서버
pnpm build    # dist/ 생성
pnpm deploy   # Pages + Worker 배포 (Cloudflare 로그인 필요)
```

`pnpm build` 는 빌드 전에 폰트 서브셋 누락(`check:font`)과
`worker/wrangler.toml` 라우트가 최신인지(`check:routes`)를 먼저 검사합니다.

## 라이선스

이미지/로고/영상 등의 Asset을 제외한 코드는 [MIT](LICENSE)입니다.
