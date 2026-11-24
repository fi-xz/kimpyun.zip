/**
 * 현재 빌드 환경의 사이트 origin. 페이지 코드 전용입니다.
 *
 * src/data/ 밖에 두는 이유: src/data/ 는 Worker 번들·타입 검사에도 들어가는데,
 * Worker(wrangler/esbuild)에는 import.meta.env 가 없습니다.
 *
 * 값은 .env.<mode> 의 VITE_SITE_ORIGIN 에서 옵니다.
 *   vite build                → .env.production (https://kimpyun.zip)
 *   vite build --mode staging → .env.staging    (https://staging.kimpyun.zip)
 * env 파일이 없는 dev 서버에서는 프로덕션 origin 으로 떨어집니다.
 * dev 서버에는 Worker 가 없으므로 단축 링크는 어차피 프로덕션에서만 동작합니다.
 */
import { CANONICAL_ORIGIN } from "./data/shortlinks";

export const SITE_ORIGIN: string = (
  import.meta.env.VITE_SITE_ORIGIN || CANONICAL_ORIGIN
).replace(/\/+$/, "");
