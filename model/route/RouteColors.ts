/**
 * 코스 색 (GRP-8 · BD-11 · OF-6 · RR-2). 데이터 시각화 색이라 토큰 예외로 하드코딩한다(CLAUDE.md).
 * 네이버 지도·오프라인 지도·3D 리플레이의 폴리라인과 고도 그래프의 단면이 **같은 파랑**이다 — 그래프와
 * 지도가 한 코스를 가리키므로 색이 갈리면 훑는 동안 둘이 같은 것이라는 단서가 사라진다.
 */
export const ROUTE_COLOR = '#2F6BFF';
// 고르지 않은 코스(옅게).
export const ROUTE_DIM_COLOR = 'rgba(47, 107, 255, 0.3)';
// 고도 그래프 단면 채움.
export const ROUTE_PROFILE_FILL = 'rgba(47, 107, 255, 0.14)';
