import GroupMemberRole from './GroupMemberRole';
import GroupPointType from './GroupPointType';

// DM-29 그룹 문서 스키마의 타입 표현.
// `exactOptionalPropertyTypes`가 켜져 있으므로 옵셔널 필드는 값이 없으면 키를 생략한다.

export interface GroupData {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  ownerId: string;
  memberIds: string[];
  memberCount: number;
  campSpotId?: string;
  destinationName?: string;
  meetingNote?: string;
  inviteEnabled: boolean;
  pointCount: number;
  routeCount: number;
  createdAt: Date;
  updatedAt: Date;
  // 역인덱스(users/{uid}/groups)로만 만든 요약본인지 — 요약본은 memberIds·카운트가 비어 있다.
  summary?: boolean;
  // 역인덱스가 들고 있는 "내 배낭 연결 여부"(GRP-1 목록 행). 그룹 문서에는 없는 값이다.
  hasMyBag?: boolean;
}

export interface GroupMemberData {
  uid: string;
  nickname: string;
  role: GroupMemberRole;
  bagId?: string;
  joinedAt: Date;
}

export interface GroupBagSnapshotGear {
  // 카탈로그 장비만 id를 싣는다 — 사용자 정의 장비 문서 ID는 싣지 않는다(DM-28·DM-29 제외 목록).
  gearId?: string;
  company: string;
  name: string;
  weight: number;
  category: string;
}

// 스냅샷의 "내용" — Firestore에 쓰기 전 빌더가 만드는 모양(syncedAt은 서버 시각이라 쓰기 시점에 붙인다).
export interface GroupBagSnapshotContent {
  bagId: string;
  name: string;
  startDate?: string;
  endDate?: string;
  destinationName?: string;
  totalWeight: number;
  itemCount: number;
  gears: GroupBagSnapshotGear[];
}

export interface GroupBagSnapshot extends GroupBagSnapshotContent {
  // 문서 ID(uid). Firestore 필드로는 저장하지 않고 읽을 때 채운다.
  uid: string;
  syncedAt: Date;
}

export interface GroupPointData {
  id: string;
  type: GroupPointType;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  authorId: string;
  authorName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupRouteBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface GroupRouteCoordinate {
  lat: number;
  lng: number;
}

export interface GroupRouteData {
  id: string;
  name: string;
  storagePath: string;
  fileSize: number;
  distance: number;
  elevationGain?: number;
  pointCount: number;
  bounds: GroupRouteBounds;
  simplified: GroupRouteCoordinate[];
  authorId: string;
  authorName: string;
  createdAt: Date;
}

// users/{uid}/groups/{groupId} — 목록 조회용 역인덱스(DM-29).
// DM-29 표의 name/startDate/endDate/role/joinedAt에 더해 GRP-1 목록 행이 요구하는
// 여행지·멤버 수·내 배낭 연결 여부를 함께 싣는다. 그룹 문서를 N번 읽지 않기 위해서다.
export interface GroupIndexData {
  groupId: string;
  name: string;
  startDate: string;
  endDate: string;
  role: GroupMemberRole;
  joinedAt: Date;
  ownerId: string;
  memberCount: number;
  campSpotId?: string;
  destinationName?: string;
  hasBag: boolean;
  // 연결한 배낭 ID(DM-29 역인덱스). 배낭이 바뀌었을 때 어느 그룹 스냅샷을 다시 써야 하는지를
  // 그룹 문서를 읽지 않고 알기 위한 값이다(GRP-5 갱신 시점 ①②).
  bagId?: string;
}

export interface GroupCreateInput {
  name: string;
  startDate: string;
  endDate: string;
  campSpotId?: string;
  destinationName?: string;
}

export interface GroupPatch {
  name?: string;
  startDate?: string;
  endDate?: string;
  // null이면 여행지 연결을 끊는다(키 제거).
  campSpotId?: string | null;
  destinationName?: string | null;
  meetingNote?: string | null;
  inviteEnabled?: boolean;
}

export interface GroupPointInput {
  type: GroupPointType;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
}

export interface GroupPointPatch {
  type?: GroupPointType;
  title?: string;
  description?: string | null;
}

// GPX 파싱 결과. Storage 업로드 **전에** `GroupValidator.validateRoute`로 검증할 수 있게
// 업로드가 결정하는 값(routeId·storagePath)을 뺀 모양을 따로 둔다(GRP-8).
export interface GroupRouteDraft {
  name: string;
  fileSize: number;
  distance: number;
  elevationGain?: number;
  pointCount: number;
  bounds: GroupRouteBounds;
  simplified: GroupRouteCoordinate[];
}

// GPX 파싱·Storage 업로드는 T7(GroupRouteUploader)이 맡고, 스토어는 그 결과만 Firestore에 쓴다.
export interface GroupRouteInput extends GroupRouteDraft {
  routeId: string;
  storagePath: string;
}

// Firestore Timestamp · Date · 숫자 어느 모양으로 와도 Date로 정규화한다.
export const toGroupDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate() as Date;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value);
  }

  return new Date(0);
};
