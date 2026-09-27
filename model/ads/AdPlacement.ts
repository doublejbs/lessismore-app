// AD-1: 광고를 두는 자리. 자리마다 광고 단위를 따로 만든다(AD-4) — 자리별 수익을 가르기 위해서다.
enum AdPlacement {
  Feed = 'feed',
  Community = 'community',
  // 탐색 검색 결과 그리드(검색어 있음) — 피드와 같은 빈도·같은 셀.
  Search = 'search',
  // 장비 상세(카탈로그 장비만) 스크롤 맨 끝 한 장.
  GearDetail = 'gear_detail',
  // 홈 스크롤 맨 끝 한 장. 동의 흐름을 시작하지 않는다(AD-3).
  Home = 'home',
}

export default AdPlacement;
