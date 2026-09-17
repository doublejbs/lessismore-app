// 그룹 상세의 포인트 목록에서 지도로 넘기는 일회성 초점 대상(GRP-9).
// 라우트 쿼리 대신 핸드오프를 쓰는 이유는 박지 지도(CS-2)와 같다 — 지도 라우트의 세그먼트는
// `id` 하나뿐이고, 화면 상태에 불과한 값을 URL에 싣지 않는다.
let pendingPointId: string | null = null;

export const setPendingGroupPoint = (pointId: string): void => {
  pendingPointId = pointId;
};

export const getPendingGroupPoint = (): string | null => {
  return pendingPointId;
};

export const clearPendingGroupPoint = (): void => {
  pendingPointId = null;
};

// 상세의 코스 목록에서 지도로 넘기는 일회성 강조 대상(GRP-8). 포인트와 같은 이유로 핸드오프다.
let pendingRouteId: string | null = null;

export const setPendingGroupRoute = (routeId: string): void => {
  pendingRouteId = routeId;
};

export const getPendingGroupRoute = (): string | null => {
  return pendingRouteId;
};

export const clearPendingGroupRoute = (): void => {
  pendingRouteId = null;
};
