import PointType from '@/model/point/PointType';
import RouteReplayMessageType from './RouteReplayMessageType';

/**
 * RN ↔ 웹뷰 메시지 계약(RR-2). 웹 문서(`RouteReplayHtml.ts`)는 이 모양을 그대로 읽고 쓴다 —
 * 필드를 바꾸면 문서의 스크립트도 함께 고친다.
 */

/** `[lng, lat]` 또는 고도가 있으면 `[lng, lat, ele]`(MapLibre 좌표 순서). */
export type RouteReplayLngLat = [number, number] | [number, number, number];

export interface RouteReplayPointPayload {
  lng: number;
  lat: number;
  title: string;
  type: PointType;
  color: string;
}

export interface RouteReplaySpeedOption {
  value: number;
  label: string;
}

/** 문서 안 문구 — HTML에 문구를 박지 않고 RN이 l10n에서 넘긴다. */
export interface RouteReplayLabels {
  start: string;
  end: string;
  play: string;
  pause: string;
  fit: string;
  speedHint: string;
  progress: string;
  speeds: RouteReplaySpeedOption[];
}

/**
 * 위성 래스터(RR-2 · MAP-7) — 앱 지도와 같은 Esri 타일을 같은 자리(`beforeId` 아래)에 끼우고 `hiddenLayerIds`를 끈다.
 * 값은 `SatelliteBasemap.ts`에서 온다.
 */
export interface RouteReplaySatellitePayload {
  sourceId: string;
  layerId: string;
  tiles: string;
  tileSize: number;
  maxzoom: number;
  attribution: string;
  beforeId: string;
  hiddenLayerIds: string[];
}

/** RN → 웹. 웹이 `ready`를 보낸 뒤 1회. */
export interface RouteReplayLoadMessage {
  type: RouteReplayMessageType.Load;
  title: string;
  coordinates: RouteReplayLngLat[];
  points: RouteReplayPointPayload[];
  labels: RouteReplayLabels;
  // 보내는 순간 지도 종류가 위성일 때만. 일반이면 `null`.
  satellite: RouteReplaySatellitePayload | null;
}

/** RN → 웹. `load` 뒤 지도 종류가 바뀔 때마다 — 문서를 다시 띄우지 않고 위성만 넣고 뺀다. */
export interface RouteReplayLayerMessage {
  type: RouteReplayMessageType.Layer;
  // 위성이면 payload, 일반이면 `null`.
  satellite: RouteReplaySatellitePayload | null;
}

export interface RouteReplayReadyMessage {
  type: RouteReplayMessageType.Ready;
}

export interface RouteReplayErrorMessage {
  type: RouteReplayMessageType.Error;
  message: string;
}

export interface RouteReplayPlayMessage {
  type: RouteReplayMessageType.Play;
  speed: number;
}

export interface RouteReplayFinishedMessage {
  type: RouteReplayMessageType.Finished;
}

/** 웹 → RN. */
export type RouteReplayWebMessage =
  | RouteReplayReadyMessage
  | RouteReplayErrorMessage
  | RouteReplayPlayMessage
  | RouteReplayFinishedMessage;

/** 웹뷰가 보낸 문자열을 메시지로 읽는다. 모양이 맞지 않으면 `null`. */
export const parseRouteReplayWebMessage = (
  raw: string
): RouteReplayWebMessage | null => {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  const message = parsed as Record<string, unknown>;

  switch (message.type) {
    case RouteReplayMessageType.Ready:
      return { type: RouteReplayMessageType.Ready };
    case RouteReplayMessageType.Error:
      return {
        type: RouteReplayMessageType.Error,
        message: typeof message.message === 'string' ? message.message : '',
      };
    case RouteReplayMessageType.Play:
      return {
        type: RouteReplayMessageType.Play,
        speed: typeof message.speed === 'number' ? message.speed : 1,
      };
    case RouteReplayMessageType.Finished:
      return { type: RouteReplayMessageType.Finished };
    default:
      return null;
  }
};
