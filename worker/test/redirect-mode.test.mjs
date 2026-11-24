/**
 * Worker 응답 회귀 테스트. 프로덕션 동작(302)이 staging 실험 때문에 바뀌지 않았음을 보장합니다.
 *
 *   pnpm test
 *
 * Node 가 worker/src/*.ts 를 직접 읽습니다(타입 스트리핑, Node 22.18+).
 * 그래서 worker 의 import 는 .ts 확장자를 붙여 씁니다.
 */
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import worker from "../src/index.ts";
import { pathsOf, routableLinks } from "../../src/data/shortlinks.ts";

/** wrangler.toml 의 [vars] 와 같은 값. 생성기가 바뀌면 아래 toml 검사가 잡습니다 */
const PRODUCTION = { REDIRECT_MODE: "302" };
const STAGING = { REDIRECT_MODE: "html", ROBOTS_NOINDEX: "true" };

const staticLinks = routableLinks.filter((l) => l.target);
const handlerLinks = routableLinks.filter((l) => l.handler);

const get = (path, env, host = "kimpyun.zip") =>
  worker.fetch(new Request(`https://${host}${path}`), env);

/** 이번 변경 전 redirect() 가 내던 헤더 그대로입니다 */
function assertLegacy302(res, target) {
  assert.equal(res.status, 302);
  assert.deepEqual(Object.fromEntries(res.headers), {
    "access-control-allow-origin": "*",
    "cache-control": "public",
    location: target,
    "x-undefined-message": "You've met with a terrible fate, Haven't you?",
  });
}

test("wrangler.toml: 프로덕션은 302, staging 만 html", () => {
  const toml = readFileSync(
    new URL("../wrangler.toml", import.meta.url),
    "utf8",
  );
  const [prod, staging] = toml.split(/^\[env\.staging\]$/m);
  assert.ok(staging, "[env.staging] 이 없습니다");
  assert.match(prod, /^\[vars\]\nREDIRECT_MODE = "302"\n/m);
  assert.doesNotMatch(prod, /"html"|ROBOTS_NOINDEX|pattern = "staging\./);
  assert.match(staging, /^REDIRECT_MODE = "html"$/m);
  assert.match(staging, /^ROBOTS_NOINDEX = "true"$/m);
  assert.doesNotMatch(staging, /pattern = "kimpyun\.zip/);
});

for (const [name, env] of [
  ["프로덕션 vars", PRODUCTION],
  ["vars 없음", {}],
  ["REDIRECT_MODE 오타", { REDIRECT_MODE: "HTML" }],
]) {
  test(`${name}: 모든 정적 경로가 기존과 같은 302`, async () => {
    for (const link of staticLinks) {
      for (const path of pathsOf(link)) {
        assertLegacy302(await get(path, env), link.target);
      }
    }
  });
}

test("staging: 아이콘이 있는 링크는 200 HTML 리디렉션", async () => {
  const withIcon = staticLinks.filter((l) => l.linkIcon);
  assert.ok(withIcon.length > 0);

  for (const link of withIcon) {
    for (const path of pathsOf(link)) {
      const res = await get(path, STAGING, "staging.kimpyun.zip");
      assert.equal(res.status, 200, path);
      assert.equal(res.headers.get("location"), null);
      assert.equal(res.headers.get("x-robots-tag"), "noindex");
      assert.match(res.headers.get("content-type"), /^text\/html/);
      assert.match(
        res.headers.get("content-security-policy"),
        /default-src 'none'/,
      );

      const html = await res.text();
      const to = link.target.replace(/&/g, "&amp;");
      assert.ok(
        html.includes(
          `<link rel="icon" type="image/png" href="/link-icons/${link.linkIcon}.png">`,
        ),
        `${path}: icon link`,
      );
      assert.ok(
        html.includes(`<meta http-equiv="refresh" content="0; url=${to}">`),
      );
      assert.ok(html.includes(`<meta name="robots" content="noindex">`));
      assert.ok(html.includes(`<title>${link.label} - 김편집</title>`));
      assert.doesNotMatch(html, /<script/i);
    }
  }
});

test("staging: 아이콘이 없는 링크(/ss, /rr)는 302 + noindex", async () => {
  const noIcon = staticLinks.filter((l) => !l.linkIcon);
  assert.deepEqual(
    noIcon.map((l) => l.path),
    ["/ss", "/rr"],
  );
  for (const link of noIcon) {
    const res = await get(link.path, STAGING, "staging.kimpyun.zip");
    assert.equal(res.status, 302);
    assert.equal(res.headers.get("location"), link.target);
    assert.equal(res.headers.get("x-robots-tag"), "noindex");
  }
});

/** 치지직 API 를 흉내 냅니다. live 가 false 면 방송 종료 응답 */
function mockChzzk(live) {
  const playback = {
    media: [
      {
        mediaId: "LLHLS",
        path: "https://example.invalid/video.m3u8",
        encodingTrack: [
          { audioOnly: true, path: "https://example.invalid/audio.m3u8" },
        ],
      },
    ],
  };
  return mock.method(globalThis, "fetch", async () =>
    Response.json({
      code: 200,
      message: null,
      content: {
        status: live ? "OPEN" : "CLOSE",
        livePlaybackJson: JSON.stringify(playback),
      },
    }),
  );
}

for (const [name, env] of [
  ["프로덕션", PRODUCTION],
  ["staging", STAGING],
]) {
  test(`${name}: .m3u8 handler 는 모드와 무관하게 302(no-store)`, async (t) => {
    const fetchMock = mockChzzk(true);
    t.after(() => fetchMock.mock.restore());

    const expected = {
      "/chzzk.m3u8": "https://example.invalid/video.m3u8",
      "/chzzk-radio.m3u8": "https://example.invalid/audio.m3u8",
    };
    for (const link of handlerLinks) {
      const res = await get(link.path, env);
      assert.equal(res.status, 302, link.path);
      assert.equal(res.headers.get("location"), expected[link.path]);
      assert.equal(res.headers.get("cache-control"), "no-store");
      assert.equal(
        res.headers.get("x-robots-tag"),
        env.ROBOTS_NOINDEX ? "noindex" : null,
      );
    }
  });
}

test("프로덕션: JSON 오류 응답에 X-Robots-Tag: noindex", async (t) => {
  const fetchMock = mockChzzk(false);
  t.after(() => fetchMock.mock.restore());

  const res = await get("/chzzk.m3u8", PRODUCTION);
  assert.equal(res.status, 400);
  assert.equal(res.headers.get("content-type"), "application/json");
  assert.equal(res.headers.get("x-robots-tag"), "noindex");
});
