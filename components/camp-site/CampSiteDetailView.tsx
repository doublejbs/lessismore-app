import { FC, useState } from 'react';
import {
  LayoutChangeEvent,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteBagSelectSheetView from './CampSiteBagSelectSheetView';
import CampSiteDetailHeaderView from './CampSiteDetailHeaderView';
import CampSiteDetailTabBarView from './CampSiteDetailTabBarView';
import CampSiteOverviewTabView from './CampSiteOverviewTabView';
import CampSiteReviewTabView from './CampSiteReviewTabView';
import CampSiteWeatherTabView from './CampSiteWeatherTabView';
import useCampSiteDetailTabState from './useCampSiteDetailTabState';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteDetailTab from '@/model/camp-site/CampSiteDetailTab';
import BagItem from '@/model/bag/BagItem';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';

interface Props {
  campSiteDetail: CampSiteDetail;
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onMoveToSpot?: (() => void) | undefined;
  // 오버레이(DST-3)에서 열렸을 때 닫기 동작 — 라우터 대신 오버레이 모달을 닫는다.
  // 없으면 기존대로 campSiteDetail.close()(router.back)를 쓴다.
  onClose?: (() => void) | undefined;
}

// 탭 바까지 넣으려면 이 정도는 있어야 한다(헤더 약 92 + 탭 바 약 50 + CTA 약 84 + 콘텐츠 여유).
// 최소 detent는 그보다 낮으므로 그땐 탭 바·탭 콘텐츠를 접는다 — 지도를 보는 상태라 의도에도 맞다(CS-3).
// 헤더와 CTA는 peek에서도 남긴다: 이름 + 주 액션만 있는 컴팩트 카드가 되고,
// 확장할 때 CTA가 제자리에 머물러 나타나는 건 탭 영역뿐이라 전환이 덜 튄다.
// 그래서 최소 detent는 헤더 92 + CTA 84가 들어가는 0.24다(0.2=약 163pt에는 CTA가 잘린다).
const FULL_LAYOUT_MIN_HEIGHT = 260;

// 박지 상세 시트(CS-3) — 고정 영역(헤더·제목·탭 바) + 탭 콘텐츠 + 고정 CTA.
// 스크롤은 각 탭 콘텐츠 안에서만 일어난다(고정 영역은 스크롤되지 않는다).
const CampSiteDetailView: FC<Props> = ({
  campSiteDetail,
  onMoveToSpot,
  onClose,
}) => {
  const spot = campSiteDetail.getSpot();
  // 시트 높이. contentStyle의 bottom: 0 덕에 이 컨테이너가 시트 높이를 그대로 갖고,
  // 사용자가 detent를 끌면 네이티브가 프레임을 바꿔 여기로 다시 들어온다(app/_layout.tsx 주석 참고).
  const [sheetHeight, setSheetHeight] = useState(0);
  const showBagSheet = campSiteDetail.shouldShowBagSheet();
  const { selectedTab, campSiteWeather, handleSelectTab } =
    useCampSiteDetailTabState(spot);

  const handlePressClose = () => {
    if (onClose) {
      onClose();

      return;
    }

    campSiteDetail.close();
  };

  const handlePressMoveToSpot = () => {
    onMoveToSpot?.();
  };

  const handlePressNaverMap = () => {
    void campSiteDetail.openNaverMap();
  };

  const handlePressShare = () => {
    void campSiteDetail.share();
  };

  const handlePressSetBag = () => {
    void campSiteDetail.openBagSheet();
  };

  const handleCloseBagSheet = () => {
    campSiteDetail.closeBagSheet();
  };

  const handleSelectBag = (bag: BagItem) => {
    void campSiteDetail.selectBag(bag);
  };

  const handleCreateBag = () => {
    campSiteDetail.createBagForSpot();
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setSheetHeight(event.nativeEvent.layout.height);
  };

  if (!spot) {
    return null;
  }

  // 높이를 재기 전(0)에는 기본 detent(40%)라고 보고 전체 레이아웃을 그린다 — peek이 깜빡이지 않게.
  const isPeek = sheetHeight > 0 && sheetHeight < FULL_LAYOUT_MIN_HEIGHT;

  return (
    <>
      <View style={styles.container} onLayout={handleLayout}>
        {/* 이름·액션 아이콘·유형 배지·지역은 탭과 무관한 박지 정체성이라 고정 영역에 둔다(CS-3). */}
        <CampSiteDetailHeaderView
          name={spot.name}
          typeLabel={getCampSiteTypeLabel(spot.type)}
          region={spot.region}
          onPressMoveToSpot={onMoveToSpot ? handlePressMoveToSpot : undefined}
          onPressShare={handlePressShare}
          onPressNaverMap={handlePressNaverMap}
          onPressClose={handlePressClose}
        />

        {/* peek(최소 detent)에서는 탭 영역을 접는다 — 헤더와 CTA만으로도 높이가 꽉 찬다.
            reanimated 레이아웃 애니메이션(FadeIn/FadeOut)은 여기서 쓰지 않는다 — 레거시
            아키텍처에서 formSheet 전환(마커 A→B의 router.replace)과 겹치면 네이티브
            UI 매니저가 크래시한다(RCTUIManager flushUIBlocksWithCompletion). */}
        {isPeek ? (
          <View style={styles.peekSpacer} />
        ) : (
          <View style={styles.tabSection}>
            <CampSiteDetailTabBarView
              selectedTab={selectedTab}
              onSelectTab={handleSelectTab}
            />

            <View style={styles.tabContent}>
              {selectedTab === CampSiteDetailTab.Overview ? (
                <CampSiteOverviewTabView spot={spot} />
              ) : null}
              {selectedTab === CampSiteDetailTab.Weather ? (
                <CampSiteWeatherTabView campSiteWeather={campSiteWeather} />
              ) : null}
              {selectedTab === CampSiteDetailTab.Review ? (
                <CampSiteReviewTabView campSiteDetail={campSiteDetail} />
              ) : null}
            </View>
          </View>
        )}

        {/* 박지 단위의 주 액션이라 어느 탭에서도 닿도록 하단에 고정한다(CS-3/CS-5). */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.setBagButton}
            onPress={handlePressSetBag}
            activeOpacity={0.7}
            accessibilityLabel='배낭 여행지로 설정'
            accessibilityRole='button'
          >
            <PretendardText style={styles.setBagButtonText} weight='semibold'>
              배낭 여행지로 설정
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>

      <CampSiteBagSelectSheetView
        visible={showBagSheet}
        bags={campSiteDetail.getBags()}
        spotName={spot.name}
        onClose={handleCloseBagSheet}
        onSelect={handleSelectBag}
        onCreateNew={handleCreateBag}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  // 탭 콘텐츠에 경계를 줘야 안쪽 ScrollView가 시트 높이 안에서 스크롤된다.
  tabSection: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  // peek에서 헤더와 CTA 사이 여백. 남는 높이를 먹어 CTA를 아래에 붙인다.
  peekSpacer: {
    flex: 1,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Color.background,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  setBagButton: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  setBagButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default observer(CampSiteDetailView);
