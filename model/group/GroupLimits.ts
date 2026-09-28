// 그룹 상한값 단일 소스 (DM-29 · GRP-2/3/4/8/9 수용 기준).
export const GROUP_NAME_MIN_LENGTH = 2;
export const GROUP_NAME_MAX_LENGTH = 40;
export const GROUP_MAX_DURATION_DAYS = 30;
export const GROUP_MAX_MEMBER_COUNT = 20;
export const GROUP_MAX_PER_USER = 20;
export const GROUP_MAX_POINT_COUNT = 50;
export const GROUP_POINT_TITLE_MIN_LENGTH = 1;
export const GROUP_POINT_TITLE_MAX_LENGTH = 40;
export const GROUP_POINT_DESCRIPTION_MAX_LENGTH = 200;
export const GROUP_MAX_ROUTE_COUNT = 5;
export const GROUP_ROUTE_NAME_MIN_LENGTH = 1;
export const GROUP_ROUTE_NAME_MAX_LENGTH = 40;
// 트랙으로 볼 수 있는 최소 점 수. 보안 규칙 isValidRoutePayload 와 같은 값이다(GRP-8).
export const GROUP_ROUTE_MIN_SIMPLIFIED_POINTS = 2;
// 파일명·트랙명이 모두 비었을 때 쓰는 코스 이름. 파일 형식 이름이라 번역하지 않는다(GRP-8).
export const GROUP_ROUTE_FALLBACK_NAME = 'GPX';
export const GROUP_ROUTE_MAX_BYTES = 5 * 1024 * 1024;
export const GROUP_ROUTE_MAX_SIMPLIFIED_POINTS = 500;
export const GROUP_MEETING_NOTE_MAX_LENGTH = 200;
// 배낭 스냅샷 상한 — 보안 규칙 isValidBagSnapshot 과 같은 값이다(DM-29).
export const GROUP_BAG_SNAPSHOT_NAME_MAX_LENGTH = 100;
export const GROUP_BAG_SNAPSHOT_DESTINATION_NAME_MAX_LENGTH = 100;
export const GROUP_BAG_SNAPSHOT_MAX_GEAR_COUNT = 300;
// 좌표 유효 범위(WGS84).
export const GROUP_MAX_LATITUDE = 90;
export const GROUP_MAX_LONGITUDE = 180;
export const GROUP_DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
