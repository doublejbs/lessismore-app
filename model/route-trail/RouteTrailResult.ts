import { RouteCoordinate } from '@/model/route/RouteData';
import RouteTrailFailReason from './RouteTrailFailReason';

// 등산로 따라 잇기 요청 결과 (RD-6). 성공이면 길 좌표(서버가 준 `ele` 포함)와 길 거리(m).
export type RouteTrailResult =
  | { ok: true; coordinates: RouteCoordinate[]; distance: number }
  | { ok: false; reason: RouteTrailFailReason };
