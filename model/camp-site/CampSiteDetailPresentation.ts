// 박지 상세(CS-3)를 어떤 형태로 띄웠는지. 같은 화면 컴포넌트를 두 진입이 공유하되
// **닫기 UI와 스크롤 상단 인셋**이 갈린다(2026-08-13 사용자 결정).
// - Sheet: 지도 탭·여행지 선택기(DST-3)의 formSheet 진입 — 우상단 닫기(X), 인셋 없음.
// - Page: 배낭 상세 > 여행지의 `박지 상세 보기`(DST-8) 일반 푸시 페이지 —
//   닫기(X) 대신 뒤로가기 헤더(LG-1), iOS는 투명 헤더만큼 자동 인셋.
enum CampSiteDetailPresentation {
  Sheet = 'sheet',
  Page = 'page',
}

export default CampSiteDetailPresentation;
