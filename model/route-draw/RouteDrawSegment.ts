import { RouteCoordinate } from '@/model/route/RouteData';
import RouteDrawSegmentMode from './RouteDrawSegmentMode';

/**
 * 그리는 코스의 구간 하나 (RD-6) — 찍은 점 `i` → `i+1`. 찍은 점이 `n`개면 구간은 `n−1`개다.
 *
 * - `coordinates`: 구간을 그리는 좌표. 첫·끝 좌표는 찍은 두 점과 같은 자리다(길 좌표가 떨어져 있으면 찍은 점을
 *   덧붙여 잇는다). 길 따라 구간은 서버가 준 `ele`가 있을 수 있다.
 * - `pending`: 길을 찾는 중 — 그동안 좌표는 두 점 직선이고 지도에 점선 회색으로 그린다.
 * - `id`: 늦게 온 응답이 되돌리기로 지워진 구간·다음 그리기에 섞이지 않게 대조하는 값.
 */
export interface RouteDrawSegment {
  id: number;
  mode: RouteDrawSegmentMode;
  coordinates: RouteCoordinate[];
  pending: boolean;
}
