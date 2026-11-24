/**
 * 단축 URL 단일 출처.
 *
 * 여기 한 곳만 고치면 네 곳이 함께 갱신됩니다.
 *   1. worker/wrangler.toml [[routes]]  — scripts/wrangler-url-generator.mjs 가 생성
 *   2. worker/src/index.ts  라우팅      — 이 배열에서 조회 맵을 만듦
 *   3. 목록 페이지                      — listed: true 인 항목만 표시
 *   4. robots.txt Disallow              — handler 가 있는 경로(vite.config.ts 가 생성)
 *
 * 이미지·CSS 를 import 하지 마십시오. 이 파일은 Worker 번들에도 들어갑니다.
 * 아이콘은 각 페이지에서 path 로 매핑합니다.
 */

const CHANNEL_ID = "0f171fd568c130cf09f2d3a641c4cbf1";

/** 목록 페이지가 광고하는 정식 도메인 */
export const SITE = "https://kimpyun.zip";

/** worker/src/index.ts 의 handlers 와 키가 일치해야 합니다(타입으로 강제됨) */
export type HandlerName = "chzzkM3u8" | "chzzkRadioM3u8";

/**
 * 목록 페이지의 묶음.
 *
 * - channel — 눌러서 이동하는 곳. 행 전체가 링크입니다
 * - stream  — 외부 플레이어·오버레이에 붙여넣는 주소. 링크가 아니라 복사 버튼입니다
 *
 * 이 구분이 복사 버튼에 근거를 줍니다. 섹션 없이 일부 행에만 버튼이 붙으면
 * 왜 그 행만 다른지 설명하는 것이 없습니다.
 */
export type LinkSection = "channel" | "stream";

interface ShortLinkBase {
  /** "/chzzk" — 반드시 "/" 로 시작 */
  path: string;
  /** 목록 페이지에 표시할 이름. listed: false 면 비워도 됩니다 */
  label: string;
  /** 목록 페이지 노출 여부 */
  listed: boolean;
  /** 목록 페이지에서 어느 묶음에 들어가는지 */
  section: LinkSection;
  /** "/yt" 처럼 같은 대상으로 보내는 별칭 */
  aliases?: readonly string[];
}

/** 정적 리다이렉트 */
interface StaticLink extends ShortLinkBase {
  target: string;
  handler?: never;
}

/** .m3u8 처럼 실행 로직이 필요한 경로 */
interface DynamicLink extends ShortLinkBase {
  handler: HandlerName;
  target?: never;
}

/** target 과 handler 는 반드시 하나만 가집니다(둘 다 쓰면 타입 오류) */
export type ShortLink = StaticLink | DynamicLink;

/**
 * 배열 순서가 곧 목록 페이지의 표시 순서입니다.
 */
export const shortLinks = [
  {
    path: "/youtube",
    section: "channel",
    label: "유튜브 본 채널",
    listed: true,
    target: "https://www.youtube.com/channel/UCqIsRcbdqG2AyR4dZWaLAGg",
    aliases: ["/yt"],
  },
  {
    path: "/full",
    section: "channel",
    label: "풀영상 채널",
    listed: true,
    target: "https://www.youtube.com/channel/UC84_f3MneocxMfDs8sm18CA",
  },
  {
    path: "/rage",
    section: "channel",
    label: "빡겜 김편집 채널",
    listed: true,
    target: "https://www.youtube.com/channel/UCSq0uzRoCGJkYzXNA5IRA8A",
  },
  {
    path: "/basement1",
    section: "channel",
    label: "김편집 지하1층 채널",
    listed: true,
    target: "https://www.youtube.com/channel/UCyRlJv071Hb0ezcb7aZ4XeQ",
    // Backwards compatibility
    aliases: ["/edit", "/b1"],
  },
  {
    path: "/chzzk",
    section: "channel",
    label: "치지직",
    listed: true,
    target: `https://chzzk.naver.com/live/${CHANNEL_ID}`,
  },
  {
    path: "/chzzk/chat",
    section: "channel",
    label: "치지직 (채팅)",
    listed: true,
    target: `https://chzzk.naver.com/live/${CHANNEL_ID}/chat`,
  },
  {
    path: "/chzzk.m3u8",
    section: "stream",
    label: "치지직 (HLS .m3u8)",
    listed: true,
    handler: "chzzkM3u8",
  },
  {
    path: "/chzzk-radio.m3u8",
    section: "stream",
    label: "치지직 (라디오 .m3u8)",
    listed: true,
    handler: "chzzkRadioM3u8",
  },
  {
    path: "/cafe",
    section: "channel",
    label: "편찻집 (네이버 팬카페)",
    listed: true,
    target: "https://cafe.naver.com/kpjchzzk",
  },
  {
    path: "/x",
    section: "channel",
    label: "X (구 Twitter)",
    listed: true,
    target: "https://x.com/__ARPA",
    aliases: ["/twitter"],
  },
  {
    path: "/discord",
    section: "channel",
    label: "디스코드 (편디코)",
    listed: true,
    target: "https://discord.com/invite/BRrtWgEJ6C",
  },
  {
    path: "/ss",
    section: "channel",
    label: "",
    listed: false,
    target: "https://surfshark.com/arpa",
  },
  {
    path: "/rr",
    section: "channel",
    label: "",
    listed: false,
    target: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
] as const satisfies readonly ShortLink[];

/**
 * 라우팅용 뷰.
 * shortLinks 는 as const 라 각 항목이 리터럴 타입이고, 그 타입에는
 * 선언하지 않은 target/handler/aliases 가 아예 없습니다. 판별 유니온으로
 * 넓혀야 link.handler 같은 접근과 좁히기가 가능합니다.
 */
export const routableLinks: readonly ShortLink[] = shortLinks;

/** 링크 하나가 차지하는 모든 경로(정식 경로 + 별칭) */
export const pathsOf = (link: ShortLink): readonly string[] => [
  link.path,
  ...(link.aliases ?? []),
];

/** 배열에 실제로 존재하는 경로만 허용하는 타입. 오타를 컴파일 단계에서 잡습니다 */
export type ShortPath = (typeof shortLinks)[number]["path"];

/** "https://kimpyun.zip/youtube" 처럼 도메인까지 붙인 정식 단축 URL */
export type ShortUrl = `${typeof SITE}${ShortPath}`;

/** 목록 페이지에 노출되는 경로 */
export type ListedPath = Extract<
  (typeof shortLinks)[number],
  { listed: true }
>["path"];

/** 목록 페이지에 표시할 항목. 타입 술어로 좁혀야 path 가 ListedPath 가 됩니다 */
export const listedLinks = shortLinks.filter(
  (link): link is Extract<(typeof shortLinks)[number], { listed: true }> =>
    link.listed,
);

/** 섹션별로 나눈 목록. 배열 순서가 각 섹션 안의 표시 순서입니다 */
export const listedBySection = {
  channel: listedLinks.filter((link) => link.section === "channel"),
  stream: listedLinks.filter((link) => link.section === "stream"),
} as const;
