import { StrictMode, type ReactNode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

/** src/entry-server.tsx 와 같은 감싸기여야 hydrate 결과가 일치합니다 */
export const wrap = (node: ReactNode) => <StrictMode>{node}</StrictMode>;

/**
 * 페이지 진입점(pages/*.tsx)이 호출합니다.
 *
 * 빌드 결과물은 #root 안에 미리 그린 HTML 이 들어 있으므로 hydrate 합니다.
 * dev 서버는 미리 그리지 않아 #root 가 비어 있으므로 새로 렌더합니다.
 */
export function mount(node: ReactNode): void {
  const root = document.getElementById("root")!;
  if (root.firstElementChild) hydrateRoot(root, wrap(node));
  else createRoot(root).render(wrap(node));
}
