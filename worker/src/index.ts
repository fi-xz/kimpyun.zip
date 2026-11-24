import {
  pathsOf,
  routableLinks,
  type HandlerName,
  type ShortLink,
} from "../../src/data/shortlinks.ts";
import { htmlRedirect, json, redirect } from "./helper.ts";
import type { BaseResponse, Env, LivePlayback } from "./type.ts";

const CHANNEL_ID = "0f171fd568c130cf09f2d3a641c4cbf1";

// CHZZK Handler

async function handleChzzkM3u8(isRadio = false): Promise<Response> {
  let apiRes: Response;
  try {
    apiRes = await fetch(
      `https://api.chzzk.naver.com/service/v3.3/channels/${CHANNEL_ID}/live-detail`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
        },
      },
    );
  } catch {
    return json({ error: "R_ERR_0002" }, 500);
  }

  if (apiRes.status !== 200) {
    return json({ error: "RS_ERR_0001" }, 500);
  }

  let body: BaseResponse;
  try {
    body = (await apiRes.json()) as BaseResponse;
  } catch {
    return json({ error: "BD_ERR_0002" }, 500);
  }

  if (body.code !== 200) {
    return json({ error: "RS_ERR_0002" }, 500);
  }

  const detail = body.content;

  if (detail.status === "CLOSE") {
    return json(
      {
        error: "Bad Request",
        message: "The live is closed",
        errorCode: "CZ_ERR_0001",
      },
      400,
    );
  }

  let playback: LivePlayback;
  try {
    playback = JSON.parse(detail.livePlaybackJson) as LivePlayback;
  } catch {
    return json({ error: "BD_ERR_0003" }, 500);
  }

  if (!playback.media?.length) {
    return json(
      {
        error: "CZ_ERR_0002",
        message: "The live is closed or the required media data does not exist",
      },
      400,
    );
  }

  // 스트림 URL 은 방송마다 달라지므로 캐시를 금지합니다(no-store).
  for (const media of playback.media) {
    if (media.mediaId === "LLHLS") {
      if (!isRadio) {
        return redirect(media.path, 302, true);
      }
      for (const track of media.encodingTrack) {
        if (track.path && track.audioOnly) {
          return redirect(track.path, 302, true);
        }
      }
    }
  }

  return json(
    {
      error: "CZ_ERR_0003",
      message: "The live is closed or the required media data does not exist",
    },
    400,
  );
}

/**
 * shortlinks.ts 의 handler 이름 → 실제 구현.
 * Record 의 키가 HandlerName 유니온이므로, 데이터에 새 handler 를 추가하고
 * 여기 구현을 빠뜨리면 타입 검사가 실패합니다.
 */
const handlers: Record<HandlerName, () => Promise<Response>> = {
  chzzkM3u8: () => handleChzzkM3u8(false),
  chzzkRadioM3u8: () => handleChzzkM3u8(true),
};

/** path(별칭 포함) → 링크. 모듈 로드 시 한 번만 만듭니다 */
const routes = new Map<string, ShortLink>();
for (const link of routableLinks) {
  for (const path of pathsOf(link)) {
    routes.set(path, link);
  }
}

/**
 * 정적 링크 하나를 응답으로 바꿉니다.
 *
 * REDIRECT_MODE 가 정확히 "html" 이고 아이콘이 지정된 링크만 HTML 리디렉션이 됩니다.
 * 그 외(값 없음, "302", 오타)는 전부 기존 302 입니다 — 프로덕션이 실수로
 * 바뀌지 않도록 기본값을 302 쪽에 둡니다.
 */
function staticResponse(link: ShortLink & { target: string }, env: Env) {
  if (env.REDIRECT_MODE === "html" && link.linkIcon) {
    return htmlRedirect(
      link.target,
      `${link.label} - 김편집`,
      `/link-icons/${link.linkIcon}.png`,
    );
  }
  return redirect(link.target);
}

async function route(request: Request, env: Env): Promise<Response> {
  const link = routes.get(new URL(request.url).pathname);

  // 등록되지 않은 경로는 origin(Pages) 으로 흘려보냅니다.
  // wrangler.toml [[routes]] 가 정확하면 여기 오는 일은 거의 없습니다.
  if (!link) return fetch(request);

  // handler(.m3u8)는 리디렉션 모드와 무관하게 항상 기존 동작(302)입니다.
  if (link.handler) return handlers[link.handler]();
  return staticResponse(link, env);
}

// Main handler

export default {
  async fetch(request: Request, env: Env = {}): Promise<Response> {
    const res = await route(request, env);
    if (env.ROBOTS_NOINDEX !== "true") return res;

    // staging: 이 Worker 가 내보내는 모든 응답을 색인에서 뺍니다.
    // fetch() 로 받은 응답은 헤더가 불변이라 복사해서 고칩니다.
    const out = new Response(res.body, res);
    out.headers.set("X-Robots-Tag", "noindex");
    return out;
  },
};
