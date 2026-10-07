import {
  defineConfig,
  type IndexHtmlTransformContext,
  type Plugin,
} from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { fileURLToPath } from "node:url";
import { relative, sep } from "node:path";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const PAGES_DIR = r("./pages");

/** 정식 도메인. src/data/shortlinks.ts 의 SITE 와 같은 값입니다 */
const SITE = "https://kimpyun.zip";

/** 06번 다크 모드의 --surface 토큰과 일치해야 합니다 (src/index.css) */
const THEME = { light: "#edecea", dark: "#1c1b1a" } as const;

/** public/og.png 의 실제 크기. 틀리게 적으면 크롤러가 미리보기를 잘못 그립니다 */
const OG_IMAGE = {
  url: SITE + "/og.png",
  size: 362,
  alt: "김편집 프로필 사진",
};

interface PageMeta {
  /** Vite root(= pages/) 기준 경로 */
  file: string;
  title: string;
  description: string;
  /** 사이트 내 정식 경로. null 이면 색인 대상이 아닙니다(404) */
  path: string | null;
  ogType?: "profile" | "website";
}

/**
 * 페이지 단일 출처.
 * 빌드 엔트리 · dev 라우트 · 메타 태그 · sitemap.xml 이 전부 여기서 나옵니다.
 */
const PAGES = {
  main: {
    file: "index.html",
    title: "김편집",
    description:
      "리듬게임 요소가 있으면 뭐든지 퍼먹는 스트리머 김편집입니다. 리듬게임 대회 캐스터 및 해설을 하고있습니다.",
    path: "/",
    ogType: "profile",
  },
  availableUrls: {
    file: "available-urls/index.html",
    title: "사용 가능한 URL 목록 - 김편집",
    description: "kimpyun.zip 에서 사용할 수 있는 단축 URL 목록입니다.",
    path: "/available-urls/",
  },
  notFound: {
    file: "404.html",
    title: "404 - 김편집",
    description: "요청하신 페이지를 찾을 수 없습니다.",
    path: null,
  },
} as const satisfies Record<string, PageMeta>;

/**
 * 색인 대상 경로. dev 라우팅과 sitemap 이 함께 씁니다.
 *
 * `as const` 때문에 path 가 리터럴 타입("/" | "/available-urls/")이 됩니다.
 * 그대로 두면 `ROUTES.includes(임의의 문자열)` 이 타입 오류가 나므로
 * map 단계에서 string 으로 넓힙니다.
 */
const ROUTES: string[] = Object.values(PAGES)
  .map((p): string | null => p.path)
  .filter((p): p is string => p !== null);

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

const meta = (kind: "name" | "property", key: string, content: string) =>
  `<meta ${kind}="${key}" content="${esc(content)}" />`;

/**
 * 세 HTML 이 공유하는 head 를 만듭니다.
 * 이게 없으면 같은 태그 20여 개를 세 파일에 복붙해야 하고,
 * 한 곳만 고쳐서 어긋나는 사고가 납니다.
 */
function renderHead(page: PageMeta): string {
  const url = page.path === null ? null : SITE + page.path;

  return [
    `<title>${esc(page.title)}</title>`,
    meta("name", "description", page.description),
    url === null
      ? meta("name", "robots", "noindex")
      : `<link rel="canonical" href="${url}" />`,
    "",
    meta("property", "og:type", page.ogType ?? "website"),
    meta("property", "og:site_name", "김편집"),
    meta("property", "og:locale", "ko_KR"),
    meta("property", "og:title", page.title),
    meta("property", "og:description", page.description),
    ...(url === null ? [] : [meta("property", "og:url", url)]),
    meta("property", "og:image", OG_IMAGE.url),
    meta("property", "og:image:alt", OG_IMAGE.alt),
    meta("property", "og:image:width", String(OG_IMAGE.size)),
    meta("property", "og:image:height", String(OG_IMAGE.size)),
    "",
    // 정사각 프로필이므로 summary_large_image 가 아니라 summary 입니다.
    // 후자를 쓰려면 1200x630 가로형 이미지를 따로 만들어야 합니다.
    meta("name", "twitter:card", "summary"),
    meta("name", "twitter:title", page.title),
    meta("name", "twitter:description", page.description),
    meta("name", "twitter:image", OG_IMAGE.url),
    meta("name", "twitter:image:alt", OG_IMAGE.alt),
    "",
    `<meta name="theme-color" content="${THEME.light}" media="(prefers-color-scheme: light)" />`,
    `<meta name="theme-color" content="${THEME.dark}" media="(prefers-color-scheme: dark)" />`,
    "",
    `<link rel="icon" type="image/png" href="/favicon.png" />`,
    `<link rel="apple-touch-icon" href="/apple-touch-icon.png" />`,
    `<link rel="manifest" href="/manifest.webmanifest" />`,
    "",
    `<link rel="preload" href="/fonts/SUITE-Variable.woff2" as="font" type="font/woff2" crossorigin />`,
  ].join("\n    ");
}

const MANIFEST =
  JSON.stringify(
    {
      name: PAGES.main.title,
      short_name: PAGES.main.title,
      description: PAGES.main.description,
      lang: "ko",
      start_url: "/",
      scope: "/",
      // 외부 링크는 scope 밖이라 브라우저로 빠져나갑니다. 창에 갇히지 않습니다.
      display: "standalone",
      background_color: THEME.light,
      theme_color: THEME.light,
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-362.png", sizes: "362x362", type: "image/png" },
      ],
    },
    null,
    2,
  ) + "\n";

const SITEMAP = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...ROUTES.map((p) => `  <url><loc>${SITE}${p}</loc></url>`),
  `</urlset>`,
  "",
].join("\n");

/** HTML 의 <!--head--> 자리에 공통 메타를 채웁니다 */
function pageMeta(): Plugin {
  const pageFor = (ctx: IndexHtmlTransformContext): PageMeta => {
    const rel = relative(PAGES_DIR, ctx.filename).split(sep).join("/");
    const page = Object.values(PAGES).find((p) => p.file === rel);
    if (!page) throw new Error(`PAGES 에 없는 HTML 진입점입니다: ${rel}`);
    return page;
  };

  const PLACEHOLDER = "<!--head-->";

  return {
    name: "page-meta",
    transformIndexHtml: {
      order: "pre",
      handler(html, ctx) {
        const page = pageFor(ctx);
        if (!html.includes(PLACEHOLDER)) {
          throw new Error(
            `${page.file} 에 ${PLACEHOLDER} 자리표시자가 없습니다`,
          );
        }
        return html.replace(PLACEHOLDER, renderHead(page));
      },
    },
  };
}

/** sitemap.xml · manifest.webmanifest 를 PAGES 에서 생성합니다 */
function generatedSiteFiles(): Plugin {
  const FILES: Record<string, { body: string; type: string }> = {
    "/sitemap.xml": { body: SITEMAP, type: "application/xml" },
    "/manifest.webmanifest": {
      body: MANIFEST,
      type: "application/manifest+json",
    },
  };

  return {
    name: "generated-site-files",
    // dev 에서도 같은 내용을 서빙해야 프로덕션과 어긋나지 않습니다.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = FILES[(req.url ?? "").split("?")[0]];
        if (!file) return next();
        res.setHeader("Content-Type", file.type);
        res.end(file.body);
      });
    },
    generateBundle() {
      for (const [path, file] of Object.entries(FILES)) {
        this.emitFile({
          type: "asset",
          fileName: path.slice(1),
          source: file.body,
        });
      }
    },
  };
}

/**
 * dev 서버에서 알 수 없는 경로에 404.html 을 돌려줍니다.
 * 프로덕션에서는 Cloudflare Pages 가 dist/404.html 을 자동으로 서빙하므로,
 * 이 플러그인은 dev 전용입니다(apply: "serve").
 */
function devNotFound(): Plugin {
  return {
    name: "dev-404",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "/").split("?")[0];

        // Vite 내부 요청(/@vite, /@fs, /@react-refresh), 의존성, 점 경로,
        // 확장자가 있는 파일(=엔트리 모듈·에셋)은 그대로 통과시킵니다.
        if (
          url.startsWith("/@") ||
          url.startsWith("/node_modules/") ||
          url.startsWith("/.") ||
          /\.[^/]+$/.test(url)
        ) {
          return next();
        }

        // 디렉터리 경로를 트레일링 슬래시로 정규화.
        // 301 은 브라우저가 영구 캐시하므로 dev 에서는 302 를 씁니다.
        if (!url.endsWith("/") && ROUTES.includes(url + "/")) {
          res.writeHead(302, { Location: url + "/" });
          return res.end();
        }

        if (ROUTES.includes(url)) return next();

        // 알 수 없는 경로 → 404.html 을 HMR 그대로 서빙.
        // Vite 의 html 미들웨어가 뒤이어 statusCode 를 200 으로 덮어쓰므로
        // 단순 대입(res.statusCode = 404)으로는 유지되지 않습니다. 값을 고정합니다.
        req.url = "/" + PAGES.notFound.file;
        Object.defineProperty(res, "statusCode", {
          configurable: true,
          get: () => 404,
          set: () => {},
        });
        next();
      });
    },
  };
}

export default defineConfig({
  appType: "mpa",
  root: PAGES_DIR,
  publicDir: r("./public"),
  resolve: { alias: { "@": r("./src") } },
  plugins: [react(), svgr(), pageMeta(), generatedSiteFiles(), devNotFound()],
  build: {
    outDir: r("./dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: Object.fromEntries(
        Object.entries(PAGES).map(([name, p]) => [
          name,
          r(`./pages/${p.file}`),
        ]),
      ),
    },
  },
});
