repo: doublejbs/lessismore-app
branch: develop

## Last sync

date: 2026-08-09T05:50:00Z

### Updated in this project

- develop 브랜치 기준 12개 화면을 iPhone 16 Pro(402×874) 목업으로 재현
- ACG 디자인 토큰(constants/DesignTokens.ts) 색·모서리·여백을 그대로 적용
- Pretendard 4종 + acg-terrain.png + logo/internet/magma 에셋 반입
- iOS 네이티브 탭바·투명 헤더(리퀴드 글래스) 표현 포함

## Screen map

| 프로젝트 화면 | 리포지토리 소스 |
| --- | --- |
| 홈 | components/home/HomeView.tsx, HomeUpcomingTripView.tsx, HomeWarehousePreviewView.tsx, HomeRecordSummaryView.tsx |
| 탐색 피드 | components/feed/FeedView.tsx, FeedCardView.tsx, FeedFilterBarView.tsx, FeedRankingButtonView.tsx |
| 검색 결과 | components/search-page/SearchPageView.tsx, search/SearchBarView.tsx, SearchResultView.tsx, SearchResultContentView.tsx |
| 지도 | components/camp-site/CampSiteMapView.tsx, CampSiteMapTopOverlayView.tsx, CampSiteMapBottomOverlayView.tsx, CampSiteMarkerView.tsx, CampSiteFilterChipsView.tsx |
| 배낭 목록 | components/bag/BagView.tsx, BagItemView.tsx, BagAddView.tsx, order/OrderButtonView.tsx |
| 배낭 상세 | components/bag-detail/BagDetailView.tsx, BagDetailSummaryView.tsx, BagDetailGearView.tsx, BagDetailBottomBar.tsx, BagDetailNameView.tsx, BagDetailDateView.tsx, BagDetailDestinationView.tsx, BagDetailMemoView.tsx, BagDetailActivityView.tsx |
| 패킹 모드 | components/bag-packing/BagPackingView.tsx, BagPackingHeaderView.tsx, BagPackingGearRowView.tsx, BagPackingCategorySectionView.tsx |
| 창고 | components/warehouse/WarehouseScreen.tsx, WarehouseFiltersView.tsx, WarehouseGearView.tsx, GearView.tsx |
| 장비 상세 | components/warehouse-detail/WarehouseDetailView.tsx, WarehouseDetailInformationView.tsx, WarehouseDetailSpecsView.tsx, WarehouseDetailUsageHeroView.tsx, WarehouseDetailSectionView.tsx, WarehouseDetailImageAddView.tsx |
| 박지 상세 | components/camp-site/CampSiteDetailView.tsx, CampSiteDetailHeaderView.tsx, CampSiteDetailTabBarView.tsx, CampSiteOverviewTabView.tsx, model/camp-site/CampSiteLabels.ts |
| 내 정보 | app/(tabs)/info.tsx, components/info/InfoFooterView.tsx |
| 로그인 모달 | components/login/LogInView.tsx |
| 공통 | constants/DesignTokens.ts, components/Layout.tsx, PretendardText.tsx, FloatingPillButton.tsx, acg/*, browse/CategoryChipView.tsx, app/(tabs)/_layout.tsx |
