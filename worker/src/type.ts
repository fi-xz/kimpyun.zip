/**
 * wrangler.toml [vars] 로 들어오는 환경 변수. scripts/wrangler-url-generator.mjs 가 씁니다.
 * 둘 다 선택값이며, 없으면 프로덕션 동작(302, 헤더 추가 없음)입니다.
 */
export interface Env {
  /** "html" 이면 아이콘이 있는 정적 링크를 HTML 리디렉션으로 응답합니다 */
  REDIRECT_MODE?: string;
  /** "true" 면 모든 응답에 X-Robots-Tag: noindex 를 붙입니다(staging) */
  ROBOTS_NOINDEX?: string;
}

export interface BaseResponse {
  code: number;
  message: string;
  content: LiveDetail;
}

export interface LiveDetail {
  status: string;
  livePlaybackJson: string;
}

export interface LivePlayback {
  media: Media[];
}

export interface Media {
  mediaId: string;
  path: string;
  encodingTrack: EncodingTrack[];
}

export interface EncodingTrack {
  // 무조건 포함됨
  encodingTrackId: string;
  audioBitRate: 192000;
  audioSamplingRate: number;
  audioChannel: number;
  avoidReencoding: boolean;

  // 영상 인코딩이냐 오디오 인코딩이냐에 따라 null일 수 있음

  // 영상
  videoProfile?: string | null;
  audioProfile?: string | null;
  p2pPath?: string | null;
  p2pPathUrlEncoding?: string | null;
  videoCodec?: string | null;
  videoBitRate?: number | null;
  videoFrameRate?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoDynamicRange?: string | null;

  // 오디오
  audioOnly?: boolean | null;
  path?: string | null;
  audioCodec?: string | null;
}
