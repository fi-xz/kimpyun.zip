/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

interface ImportMetaEnv {
  /** "https://kimpyun.zip" 처럼 끝 슬래시 없는 origin. .env.<mode> 에서 옵니다 */
  readonly VITE_SITE_ORIGIN?: string;
}
