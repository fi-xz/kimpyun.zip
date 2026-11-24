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
