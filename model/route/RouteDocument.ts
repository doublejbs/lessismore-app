import { deleteField, DocumentData, serverTimestamp } from 'firebase/firestore';
import { toFirestoreDate } from '@/model/firebase/FirestoreDate';
import { GROUP_ROUTE_MAX_SIMPLIFIED_POINTS } from '@/model/group/GroupLimits';
import {
  RouteCoordinate,
  RouteData,
  RouteDraft,
  RouteDrawnPoint,
} from './RouteData';
import RouteSource from './RouteSource';
import RouteValidator, { ROUTE_MIN_DRAWN_POINTS } from './RouteValidator';

type RouteDrawnFields = Pick<RouteData, 'source' | 'drawnPoints' | 'updatedAt'>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toDrawnPoint = (value: unknown): RouteDrawnPoint | null => {
  if (!isRecord(value)) {
    return null;
  }

  const lat = Number(value.lat);
  const lng = Number(value.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lng };
};

/**
 * 코스 문서의 그린 코스 필드(DM-29·DM-30 `source`·`drawnPoints`·`updatedAt`, RouteDraw RD-7)를 읽는다 — 배낭·그룹
 * 스토어가 같은 것을 쓴다. `source`가 `'drawn'`이 아니면 가져온 코스로 보고 찍은 점도 읽지 않는다(규칙도 그린 코스에만
 * 찍은 점을 허용한다). 찍은 점이 하나라도 모양이 틀리면 찍은 점 전체를 버린다 — 일부만 복원하면 구간이 어긋난다.
 */
export const toRouteDrawnFields = (data: DocumentData): RouteDrawnFields => {
  const updatedAt =
    data.updatedAt !== undefined && data.updatedAt !== null
      ? { updatedAt: toFirestoreDate(data.updatedAt) }
      : {};

  if (data.source !== RouteSource.Drawn) {
    return updatedAt;
  }

  const raw: unknown[] = Array.isArray(data.drawnPoints)
    ? data.drawnPoints
    : [];
  const points = raw.map(toDrawnPoint);
  const drawnPoints = points.every(point => point !== null)
    ? (points as RouteDrawnPoint[])
    : [];

  return {
    source: RouteSource.Drawn,
    ...(drawnPoints.length >= ROUTE_MIN_DRAWN_POINTS ? { drawnPoints } : {}),
    ...updatedAt,
  };
};

// 축약 좌표를 문서에 쓸 모양으로(500점 상한 · 고도는 있을 때만). 스토어의 create 경로와 같은 규칙이다.
const toStoredSimplified = (simplified: readonly RouteCoordinate[]) =>
  simplified.slice(0, GROUP_ROUTE_MAX_SIMPLIFIED_POINTS).map(coordinate => ({
    lat: coordinate.lat,
    lng: coordinate.lng,
    ...(coordinate.ele !== undefined && Number.isFinite(coordinate.ele)
      ? { ele: coordinate.ele }
      : {}),
  }));

// 문서에 쓸 찍은 점(2개 이상일 때만). 상한(100) 초과는 검증기가 업로드 전에 막는다(`RouteValidator.validateRoute`).
const toStoredDrawnPoints = (draft: RouteDraft) =>
  draft.drawnPoints && draft.drawnPoints.length >= ROUTE_MIN_DRAWN_POINTS
    ? draft.drawnPoints.map(point => ({ lat: point.lat, lng: point.lng }))
    : null;

/**
 * 새 코스 문서에 더하는 그린 코스 필드(RD-3 · RD-7). 가져온 코스(`source` 없음)면 빈 값이다 — 키를 쓰지 않는다.
 */
export const toRouteDrawnPayload = (
  draft: RouteDraft
): Record<string, unknown> => {
  if (draft.source !== RouteSource.Drawn) {
    return {};
  }

  const drawnPoints = toStoredDrawnPoints(draft);

  return {
    source: RouteSource.Drawn,
    ...(drawnPoints ? { drawnPoints } : {}),
  };
};

/**
 * 그린 코스 수정(RD-7)의 `updateDoc` 내용 — 같은 문서를 덮어쓴다. `storagePath`·`createdAt`·작성자는 보내지 않는다
 * (규칙이 불변을 요구한다 — 보내지 않으면 그대로 남는다). 이번 저장에 고도가 없으면 이전 상승·하강을 **지운다** —
 * 남기면 바뀐 선에 옛 값이 붙는다. 찍은 점이 2개 미만이면 이전 찍은 점도 지운다(바뀐 선과 어긋난 점이 남지 않게).
 * `updatedAt`은 서버 시각(규칙이 `request.time`과 같기를 요구한다). `source`는 수정 경로라 늘 `'drawn'`이다.
 */
export const toRouteUpdatePayload = (
  draft: RouteDraft
): Record<string, unknown> => ({
  name: RouteValidator.toRouteName(draft.name),
  // 규칙이 정수를 요구한다(`fileSize is int` · `pointCount is int`).
  fileSize: Math.round(draft.fileSize),
  distance: draft.distance,
  pointCount: Math.round(draft.pointCount),
  bounds: { ...draft.bounds },
  simplified: toStoredSimplified(draft.simplified),
  elevationGain:
    draft.elevationGain !== undefined ? draft.elevationGain : deleteField(),
  elevationLoss:
    draft.elevationLoss !== undefined ? draft.elevationLoss : deleteField(),
  source: RouteSource.Drawn,
  drawnPoints: toStoredDrawnPoints(draft) ?? deleteField(),
  updatedAt: serverTimestamp(),
});
