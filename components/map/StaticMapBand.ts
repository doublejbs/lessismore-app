/**
 * 정적 지도 밴드(MAP-3) 공용 값 — 배낭 카드(BAG-1)·스냅샷 밴드·여행지 허브 미리보기(DST-8)와
 * 배낭 목록 스켈레톤이 함께 쓴다.
 */

/**
 * 목록 카드·스냅샷 밴드의 줌 — **동네 수준**(BAG-1). 밴드 높이 110pt에서 마을·계곡 이름이 읽히고
 * 여행지가 "어디쯤"인지 알아볼 수 있는 배율이다. 한 단 낮추면 시·군 윤곽만, 한 단 올리면 건물만 남는다.
 * `[이력]` 네이버 정적 지도 때 정한 값이다 — MapLibre도 512px 타일 웹 메르카토르라 그대로 쓴다(MAP-1).
 */
export const BAG_CARD_MAP_LEVEL = 13;

/**
 * 썸네일을 기다리는 동안 밴드 자리를 채우는 면 — 배낭 목록 스켈레톤(`BagListSkeletonView`)의 밴드
 * 색과 같다. 로딩 중 밴드를 비워 두면 이미지가 오는 순간 카드가 110pt씩 늘어 목록이 덜컥거린다.
 * 스켈레톤 셰이딩은 토큰 예외다(CLAUDE.md).
 */
export const STATIC_MAP_LOADING_FILL = '#DCDCDC';

// 이미지가 도착하면 로딩 면 위로 페이드한다(ms).
export const STATIC_MAP_FADE_DURATION = 160;
