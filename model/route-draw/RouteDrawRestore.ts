import { getDistanceInMeters } from '@/model/bag-destination/GeoDistance';
import { RouteCoordinate, RouteDrawnPoint } from '@/model/route/RouteData';

// 찍은 점과 이 거리 안의 축약 좌표는 "그 점"이다(m). 저장 샘플은 찍은 점을 그대로 남기므로(RD-3) 보통 0m에서 맞는다.
const ANCHOR_MATCH_METERS = 1;

const measure = (a: RouteDrawnPoint, b: RouteDrawnPoint) =>
  getDistanceInMeters(
    { latitude: a.lat, longitude: a.lng },
    { latitude: b.lat, longitude: b.lng }
  );

/**
 * 찍은 점마다 축약 좌표의 인덱스를 찾는다(RD-7). **순서를 지킨다** — 점 `i`의 인덱스는 점 `i−1`의 인덱스보다 작지 않고,
 * 뒤에 남은 점들이 들어갈 자리를 남긴다. 범위 안에서 1m 안에 드는 **첫** 좌표를 고르고(같은 자리를 두 번 지나는
 * 코스에서 뒤쪽 통과로 건너뛰지 않게), 없으면 범위 안에서 가장 가까운 좌표를 고른다.
 * 첫 점은 0, 끝 점은 마지막 인덱스로 고정한다.
 */
export const findRouteDrawAnchors = (
  drawnPoints: readonly RouteDrawnPoint[],
  simplified: readonly RouteCoordinate[]
): number[] => {
  const pointCount = drawnPoints.length;
  const lastIndex = simplified.length - 1;
  const anchors: number[] = [0];

  for (let pointIndex = 1; pointIndex < pointCount - 1; pointIndex += 1) {
    const start = anchors[pointIndex - 1];
    // 뒤에 남은 점(끝 점 포함)이 하나씩은 차지할 수 있게 상한을 둔다. 좌표가 모자라면 같은 인덱스를 공유한다.
    const end = Math.max(start, lastIndex - (pointCount - 1 - pointIndex));
    let best = start;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = start; index <= end; index += 1) {
      const distance = measure(drawnPoints[pointIndex], simplified[index]);

      if (distance <= ANCHOR_MATCH_METERS) {
        best = index;

        break;
      }

      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    }

    anchors.push(best);
  }

  if (pointCount > 1) {
    anchors.push(Math.max(lastIndex, anchors[anchors.length - 1]));
  }

  return anchors;
};

/**
 * 저장된 코스를 구간 좌표로 되살린다(RD-7 수정 모드). 다시 라우팅하지 않는다 — 축약 좌표(`simplified`)를 찍은 점
 * 위치에서 잘라 구간 `i`(점 `i` → `i+1`)의 좌표로 쓴다. 고도(`ele`)는 그대로 옮긴다.
 *
 * - 구간 좌표의 첫·끝은 찍은 점 자리로 맞춘다(수정 중 덧붙이는 구간이 점에서 이어지게).
 * - 잘라 낸 좌표가 2개 미만이면(좌표가 점보다 적은 옛 문서 등) 두 점 직선으로 둔다.
 * - 찍은 점이 2개 미만이거나 축약 좌표가 2개 미만이면 빈 목록이다(호출자가 수정을 열지 않는다).
 */
export const restoreRouteDrawSegments = (
  drawnPoints: readonly RouteDrawnPoint[],
  simplified: readonly RouteCoordinate[]
): RouteCoordinate[][] => {
  if (drawnPoints.length < 2 || simplified.length < 2) {
    return [];
  }

  const anchors = findRouteDrawAnchors(drawnPoints, simplified);

  return drawnPoints.slice(1).map((to, index) => {
    const from = drawnPoints[index];
    const sliced = simplified.slice(anchors[index], anchors[index + 1] + 1);

    if (sliced.length < 2) {
      return [
        { lat: from.lat, lng: from.lng },
        { lat: to.lat, lng: to.lng },
      ];
    }

    const coordinates = sliced.map(coordinate => ({ ...coordinate }));
    const head = coordinates[0];
    const tail = coordinates[coordinates.length - 1];

    coordinates[0] = {
      lat: from.lat,
      lng: from.lng,
      ...(head.ele !== undefined ? { ele: head.ele } : {}),
    };
    coordinates[coordinates.length - 1] = {
      lat: to.lat,
      lng: to.lng,
      ...(tail.ele !== undefined ? { ele: tail.ele } : {}),
    };

    return coordinates;
  });
};
