import { RouteCoordinate } from '@/model/route/RouteData';
import RouteDrawSegmentMode from './RouteDrawSegmentMode';

/**
 * 그리는 코스의 구간 하나 (RD-6) — 찍은 점 `i` → `i+1`. 찍은 점이 `n`개면 구간은 `n−1`개다.
 *
 * - `coordinates`: 구간을 그리는 좌표. 첫·끝 좌표는 찍은 두 점과 같은 자리다(길 좌표가 떨어져 있으면 찍은 점을
 *   덧붙여 잇는다). 길 따라 구간은 서버가 준 `ele`가 있을 수 있다.
 * - `pending`: 길을 찾는 중 — 그동안 좌표는 두 점 직선이고 지도에 점선 회색으로 그린다.
 * - `id`: 늦게 온 응답이 되돌리기로 지워진 구간·다음 그리기에 섞이지 않게 대조하는 값.
 * - `distance`: 수정 모드(RD-7)에서 되살린 구간의 길이(m). 축약 좌표로 되살린 선은 원래 길 좌표보다 짧게 재지므로,
 *   저장된 코스 거리를 구간 길이 비율로 나눠 둔다 — 수정을 열었을 때 바 거리가 원래 코스 거리와 같게. 없으면 좌표로 잰다.
 */
export interface RouteDrawSegment {
  id: number;
  mode: RouteDrawSegmentMode;
  coordinates: RouteCoordinate[];
  pending: boolean;
  distance?: number;
  // 수정 모드(RD-7)에서 저장된 축약 좌표로 되살린 구간 — 좌표가 이미 저장 샘플이라 다시 저장할 때 그대로 쓴다.
  restored?: boolean;
}
