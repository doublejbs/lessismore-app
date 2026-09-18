// 코스(GPX) 데이터 계약 — 그룹 코스(DM-29 `groups/{groupId}/routes`)와 배낭 코스
// (DM-30 `bag/{bagId}/routes`)가 **같은 모양**을 쓴다. 사는 곳만 다르고 파서·그래프·목록 행이
// 같으므로 필드 타입도 한 곳에 둔다 — 두 벌로 두면 한쪽만 고쳐질 때 계약이 갈라진다.
//
// `exactOptionalPropertyTypes`가 켜져 있으므로 옵셔널 필드는 값이 없으면 키를 생략한다.

export interface RouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface RouteCoordinate {
  lat: number;
  lng: number;
  // 고도(m). 고도 그래프가 이 값을 그대로 쓴다(GRP-8, BD-11, DM-29·DM-30 `simplified`).
  // GPX에 고도가 없거나 이 기능 이전에 올라간 코스에는 키 자체가 없다.
  ele?: number;
}

// GPX 파싱 결과. Storage 업로드 **전에** `RouteValidator.validateRoute`로 검증할 수 있게
// 업로드가 결정하는 값(routeId·storagePath)을 뺀 모양을 따로 둔다(GRP-8, BD-11).
export interface RouteDraft {
  name: string;
  fileSize: number;
  distance: number;
  elevationGain?: number;
  pointCount: number;
  bounds: RouteBounds;
  simplified: RouteCoordinate[];
}

// 파싱·업로드가 끝난 뒤 스토어가 Firestore에 쓰는 모양. 스토어는 이 값만 보고 문서를 만든다.
export interface RouteInput extends RouteDraft {
  routeId: string;
  storagePath: string;
}

/**
 * 저장된 코스 한 건. 배낭 코스(DM-30)는 이 모양 그대로고, 그룹 코스(DM-29)는 여기에
 * 작성자(`authorId`·`authorName`)를 더한다 — 배낭 코스는 소유자 한 사람의 것이라
 * 작성자를 적을 이유가 없다(DM-30).
 */
export interface RouteData extends RouteDraft {
  id: string;
  storagePath: string;
  createdAt: Date;
}
