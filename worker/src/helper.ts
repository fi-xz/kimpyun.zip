function withCommonHeaders(headers: Headers): Headers {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "X-Undefined-Message",
    "You've met with a terrible fate, Haven't you?",
  );
  return headers;
}

/**
 * 302 를 기본값으로 씁니다. 301 은 브라우저가 무기한 캐시하므로
 * 채널 주소가 바뀌면 되돌릴 방법이 없습니다.
 *
 * noCache 는 매 요청 값이 달라지는 응답(.m3u8)용입니다.
 * "no-cache" 가 아니라 "no-store" 여야 합니다 — 전자는 저장은 하되
 * 재검증만 요구하므로, 만료된 스트림 URL 이 남습니다.
 */
export function redirect(
  location: string,
  status = 302,
  noStore = false,
): Response {
  return new Response(null, {
    status,
    headers: withCommonHeaders(
      new Headers({
        Location: location,
        "Cache-Control": noStore ? "no-store" : "public",
      }),
    ),
  });
}

/**
 * 오류 응답(.m3u8 의 방송 종료 등)이 검색 결과에 실리지 않도록 noindex 를 붙입니다.
 */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: withCommonHeaders(
      new Headers({
        "Content-Type": "application/json",
        "X-Robots-Tag": "noindex",
      }),
    ),
  });
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * 302 대신 쓰는 HTML 리디렉션(REDIRECT_MODE = "html", staging 실험 전용).
 *
 * 302 응답에는 문서가 없어 favicon 수집기가 경로별 아이콘을 알 수 없습니다.
 * 200 HTML 에 <link rel="icon"> 을 실어 단축 URL 마다 다른 favicon 을 주려는 실험입니다.
 *
 * - 이동은 meta refresh 로만 합니다. inline script 는 CSP 상 쓰지 않습니다.
 * - 리디렉션 페이지 자체는 색인 대상이 아니므로 noindex 입니다.
 * - iconHref 는 같은 호스트의 Pages 정적 자산(/link-icons/*.png)을 가리킵니다.
 */
export function htmlRedirect(
  location: string,
  title: string,
  iconHref: string,
): Response {
  const to = escapeHtml(location);
  const body = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="robots" content="noindex">
<link rel="icon" type="image/png" href="${escapeHtml(iconHref)}">
<meta http-equiv="refresh" content="0; url=${to}">
</head>
<body>
</body>
</html>
`;

  return new Response(body, {
    status: 200,
    headers: withCommonHeaders(
      new Headers({
        "Content-Type": "text/html; charset=utf-8",
        // 실험 중 아이콘·목적지를 바꾸면 바로 반영되도록 재검증을 강제합니다.
        "Cache-Control": "no-cache",
        "Content-Security-Policy":
          "default-src 'none'; img-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
      }),
    ),
  });
}
