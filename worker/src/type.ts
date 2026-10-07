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
