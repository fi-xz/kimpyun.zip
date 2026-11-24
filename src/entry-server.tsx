/**
 * 빌드 때 페이지 HTML 을 미리 그리는 SSR 진입점. 브라우저에는 실리지 않습니다.
 * vite.config.ts 의 prerender() 가 SSR 빌드로 묶어 호출합니다.
 *
 * 키는 vite.config.ts PAGES 의 file 과 같아야 합니다. 빠지면 build 가 실패합니다.
 * 각 페이지는 pages/*.tsx 진입점과 같은 컴포넌트를 그려야 hydrate 가 맞습니다.
 */
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import { wrap } from "./mount";
import App from "./App";
import AvailableUrls from "./available-urls/AvailableUrls";
import NotFound from "./not-found/NotFound";

const pages: Record<string, () => ReactElement> = {
  "index.html": () => <App />,
  "available-urls/index.html": () => <AvailableUrls />,
  "404.html": () => <NotFound />,
};

/** 미리 그릴 수 있는 페이지 목록 */
export const pageFiles = Object.keys(pages);

export function renderPage(file: string): string {
  const page = pages[file];
  if (!page) throw new Error(`entry-server 에 없는 페이지입니다: ${file}`);
  return renderToString(wrap(page()));
}
