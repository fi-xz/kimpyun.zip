import {
  routableLinks,
  type HandlerName,
  type ShortLink,
} from "../../src/data/shortlinks";
import { json, redirect } from "./helper";
import type { BaseResponse, LivePlayback } from "./type";

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
  for (const path of [link.path, ...(link.aliases ?? [])]) {
    routes.set(path, link);
  }
}

// Main handler

export default {
  async fetch(request: Request): Promise<Response> {
    const link = routes.get(new URL(request.url).pathname);

    // 등록되지 않은 경로는 origin(Pages) 으로 흘려보냅니다.
    // wrangler.toml [[routes]] 가 정확하면 여기 오는 일은 거의 없습니다.
    if (!link) return fetch(request);

    if (link.handler) return handlers[link.handler]();
    return redirect(link.target);
  },
};
