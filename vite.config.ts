import {
  build,
  defineConfig,
  type IndexHtmlTransformContext,
  type Plugin,
  type ResolvedConfig,
} from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  existsSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative, sep } from "node:path";
import {
  CANONICAL_ORIGIN,
  pathsOf,
  routableLinks,
} from "./src/data/shortlinks.ts";

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const PAGES_DIR = r("./pages");

/**
 * 정식 도메인. canonical · og:url · sitemap 은 staging 빌드에서도 프로덕션을 가리킵니다.
 * staging 은 X-Robots-Tag: noindex 로 색인을 막으므로(public/_headers) 이 편이 안전합니다.
 */
const SITE = CANONICAL_ORIGIN;

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
  /** twitter:title 만 따로 줄 때. 없으면 title 을 씁니다 */
  twitterTitle?: string;
  description: string;
  /** 사이트 내 정식 경로. null 이면 색인 대상이 아닙니다(404) */
  path: string | null;
  ogType?: "profile" | "website";
  /**
   * 미리 그린 HTML 위에 React 를 붙일지(hydrate) 여부. 기본값 true.
   * false 면 빌드 결과에서 JS 를 빼고 HTML + CSS 만 남깁니다.
   * 상호작용(상태·이벤트)이 없는 페이지에만 쓰십시오. dev 서버는 이 값과 무관하게 JS 로 렌더합니다.
   */
  hydrate?: boolean;
}

/**
 * 페이지 단일 출처.
 * 빌드 엔트리 · dev 라우트 · 메타 태그 · sitemap.xml 이 전부 여기서 나옵니다.
 */
const PAGES = {
  main: {
    file: "index.html",
    title: "김편집",
    // X 는 짧은 제목(3글자 이하)을 카드에 표시하지 않습니다(직접 실험으로 확인했습니다).
    // 그래서 twitter:title 만 길게 줍니다. <title> 과 og:title 은 "김편집" 그대로입니다.
    // Google 은 제목 링크를 만들 때 twitter:title 을 보지 않으므로 검색 결과에는 영향이 없습니다.
    twitterTitle: "메인 페이지 - 김편집",
    description:
      "리듬게임 요소가 있으면 뭐든지 퍼먹는 스트리머 김편집입니다. 리듬게임 대회 캐스터 및 해설을 하고있습니다.",
    path: "/",
    ogType: "profile",
    // 링크와 이미지뿐이라 JS 가 필요 없습니다. React 번들(gzip 약 69KB)을 받지 않습니다.
    hydrate: false,
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

/** "/available-urls/" 와 "/available-urls" 를 같은 경로로 봅니다(Pages 가 슬래시를 정규화) */
const normalizePath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);

/**
 * 페이지 경로와 단축 URL 경로가 겹치면 build 를 실패시킵니다.
 * 겹치면 Worker 라우트가 페이지를 가로채, sitemap 에 실린 주소가
 * 페이지 대신 리다이렉트를 돌려주게 됩니다.
 */
function assertNoRouteOverlap(): void {
  const pages = new Map(ROUTES.map((p) => [normalizePath(p), p]));
  const clashes = routableLinks.flatMap((link) =>
    pathsOf(link)
      .filter((p) => pages.has(normalizePath(p)))
      .map(
        (p) =>
          `${p} (단축 URL ${link.path}) ↔ 페이지 ${pages.get(normalizePath(p))}`,
      ),
  );
  if (clashes.length) {
    throw new Error(
      `PAGES 경로와 shortlinks 경로가 겹칩니다:\n  - ${clashes.join("\n  - ")}`,
    );
  }
}

/** HTML 리디렉션 모드가 가리킬 아이콘 파일이 실제로 있는지 확인합니다 */
function assertLinkIcons(): void {
  const missing = [
    ...new Set(routableLinks.flatMap((l) => (l.linkIcon ? [l.linkIcon] : []))),
  ].filter((name) => !existsSync(r(`./public/link-icons/${name}.png`)));
  if (missing.length) {
    throw new Error(
      `public/link-icons/ 에 없는 아이콘입니다: ${missing.join(", ")}\n` +
        "  해결: pnpm run icons:links",
    );
  }
}

assertNoRouteOverlap();
assertLinkIcons();

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
    meta("name", "twitter:title", page.twitterTitle ?? page.title),
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
    `<link rel="discord:component-embed" type="application/json" href="%VITE_SITE_ORIGIN%/embed.json">`,
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

/**
 * 실행 로직(handler)이 있는 단축 URL 은 크롤러가 부를 때마다 치지직 API 를 호출하고,
 * 방송 중이 아니면 JSON 오류를 돌려줍니다. 색인할 가치가 없으므로 막습니다.
 *
 * 정적 리다이렉트는 막지 않습니다. 막으면 크롤러가 목적지를 따라가지 못해
 * 링크 미리보기·favicon 수집이 깨질 수 있습니다.
 * 같은 이유로 staging 도 `Disallow: /` 대신 X-Robots-Tag 로 색인만 막습니다.
 *
 * Cloudflare AI Crawl Control(Managed robots.txt)을 끈 상태를 전제로 합니다.
 * 켜져 있으면 Cloudflare 가 이 내용 앞에 자체 규칙을 덧붙입니다.
 */
const ROBOTS = [
  "User-agent: *",
  ...routableLinks
    .filter((link) => link.handler)
    .flatMap(pathsOf)
    .map((p) => `Disallow: ${p}`),
  "",
  `Sitemap: ${SITE}/sitemap.xml`,
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

/** sitemap.xml · manifest.webmanifest · robots.txt 를 PAGES · shortlinks 에서 생성합니다 */
function generatedSiteFiles(): Plugin {
  const FILES: Record<string, { body: string; type: string }> = {
    "/sitemap.xml": { body: SITEMAP, type: "application/xml" },
    "/robots.txt": { body: ROBOTS, type: "text/plain; charset=utf-8" },
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

const SSR_ENTRY = r("./src/entry-server.tsx");
/** 미리 그리기용 SSR 번들 임시 위치. 끝나면 지웁니다 */
const SSR_OUT = r("./node_modules/.prerender");
const ROOT_EMPTY = `<div id="root"></div>`;

/** 빌드 결과에서 JS 를 걷어냅니다(hydrate: false 페이지) */
const stripScripts = (html: string) =>
  html
    .replace(/[ \t]*<script type="module"[^>]*><\/script>\n?/g, "")
    .replace(/[ \t]*<link rel="modulepreload"[^>]*>\n?/g, "");

/**
 * 클라이언트 빌드가 끝나면 각 페이지의 #root 를 미리 그린 HTML 로 채웁니다.
 *
 * 그대로 두면 첫 화면이 React 를 받아 실행한 뒤에야 나타납니다. 모바일
 * (느린 네트워크·CPU)에서 LCP 가 그만큼 늦어지고, 한국 → 해외 PoP 처럼
 * 왕복 지연이 큰 경로에서는 HTML → JS → 이미지 순서의 대기가 쌓입니다.
 *
 * 같은 설정으로 SSR 빌드를 한 번 더 돌리므로 CSS Modules 클래스명과
 * 에셋 해시가 클라이언트 빌드와 같습니다. 어긋나면 아래 검사가 build 를 실패시킵니다.
 */
function prerender(): Plugin {
  let config: ResolvedConfig;

  return {
    name: "prerender",
    apply: (_, env) => env.command === "build" && !env.isSsrBuild,
    configResolved(c) {
      config = c;
    },
    async closeBundle() {
      const outDir = config.build.outDir;

      await build({
        configFile: r("./vite.config.ts"),
        mode: config.mode,
        logLevel: "warn",
        build: { ssr: SSR_ENTRY, outDir: SSR_OUT, emptyOutDir: true },
      });

      try {
        const bundle = readdirSync(SSR_OUT).find((f) => /\.m?js$/.test(f));
        if (!bundle) throw new Error("SSR 번들을 찾지 못했습니다");
        const server = (await import(
          pathToFileURL(join(SSR_OUT, bundle)).href
        )) as {
          pageFiles: string[];
          renderPage: (file: string) => string;
        };

        const assets = readdirSync(join(outDir, "assets"));
        const css = assets
          .filter((f) => f.endsWith(".css"))
          .map((f) => readFileSync(join(outDir, "assets", f), "utf8"))
          .join("\n");

        for (const page of Object.values(PAGES) as PageMeta[]) {
          if (!server.pageFiles.includes(page.file)) {
            throw new Error(`src/entry-server.tsx 에 ${page.file} 가 없습니다`);
          }

          const file = join(outDir, page.file);
          const html = readFileSync(file, "utf8");
          if (html.split(ROOT_EMPTY).length !== 2) {
            throw new Error(
              `${page.file} 에 ${ROOT_EMPTY} 가 정확히 하나여야 합니다`,
            );
          }

          const body = server.renderPage(page.file);
          let out = html.replace(
            ROOT_EMPTY,
            () => `<div id="root">${body}</div>`,
          );
          if (page.hydrate === false) out = stripScripts(out);

          // SSR 과 클라이언트 빌드가 어긋나면 화면이 깨진 채 배포됩니다. 여기서 막습니다.
          const missingAssets = [...body.matchAll(/\/assets\/[^"'\s)]+/g)]
            .map((m) => m[0].slice("/assets/".length))
            .filter((name) => !assets.includes(name));
          const missingClasses = [...body.matchAll(/class="([^"]+)"/g)]
            .flatMap((m) => m[1].split(/\s+/))
            .filter((name) => !css.includes(`.${name}`));
          if (missingAssets.length || missingClasses.length) {
            throw new Error(
              `${page.file}: 미리 그린 HTML 이 클라이언트 빌드와 어긋납니다\n` +
                `  없는 에셋: ${missingAssets.join(", ") || "-"}\n` +
                `  없는 클래스: ${missingClasses.join(", ") || "-"}`,
            );
          }

          writeFileSync(file, out);
        }
        config.logger.info(
          `✓ 미리 그리기 — ${Object.values(PAGES)
            .map((p) => p.file)
            .join(", ")}`,
        );
      } finally {
        rmSync(SSR_OUT, { recursive: true, force: true });
      }
    },
  };
}

export default defineConfig(({ isSsrBuild }) => ({
  appType: "mpa",
  root: PAGES_DIR,
  envDir: r("./"),
  publicDir: r("./public"),
  resolve: { alias: { "@": r("./src") } },
  plugins: isSsrBuild
    ? // 미리 그리기용 SSR 빌드. HTML·사이트 파일 생성은 클라이언트 빌드가 맡습니다.
      [react(), svgr()]
    : [
        react(),
        svgr(),
        pageMeta(),
        generatedSiteFiles(),
        devNotFound(),
        prerender(),
      ],
  build: isSsrBuild
    ? {}
    : {
        outDir: r("./dist"),
        emptyOutDir: true,
        // 배포물은 minify 한 채로 두고, 개발자 도구에서만 원본 소스로 보이게 합니다.
        // .map 은 개발자 도구를 열 때만 받아지므로 방문자에게는 비용이 없습니다.
        // 공개 저장소라 원본이 드러나도 잃을 것이 없습니다.
        sourcemap: true,
        rollupOptions: {
          input: Object.fromEntries(
            Object.entries(PAGES).map(([name, p]) => [
              name,
              r(`./pages/${p.file}`),
            ]),
          ),
        },
      },
}));
