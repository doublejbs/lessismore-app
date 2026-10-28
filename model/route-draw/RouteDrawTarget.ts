import RouteDrawTargetKind from './RouteDrawTargetKind';

// 코스를 그려 올리는 곳 — 배낭 또는 그룹 하나(RD-8). 화면이 그리기 모델에 넘긴다.
export interface RouteDrawParent {
  kind: RouteDrawTargetKind;
  parentId: string;
}

/**
 * 그린 코스 한 건을 가리키는 값 (RD-8 · DM-36 `freeRoute`). 무료 1회 기록(`claimFreeRouteDraw`)·수정 대상
 * (`routeTrail`의 `editing`)·수정 권한 판단이 같은 모양을 쓴다.
 */
export interface RouteDrawTarget extends RouteDrawParent {
  routeId: string;
}
