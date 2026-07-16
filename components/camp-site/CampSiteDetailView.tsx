import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
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
}

// 박지 상세 시트(CS-3) — 고정 영역(헤더·제목·탭 바) + 탭 콘텐츠 + 고정 CTA.
// 스크롤은 각 탭 콘텐츠 안에서만 일어난다(고정 영역은 스크롤되지 않는다).
const CampSiteDetailView: FC<Props> = ({ campSiteDetail, onMoveToSpot }) => {
  const spot = campSiteDetail.getSpot();
  const showBagSheet = campSiteDetail.shouldShowBagSheet();
  const { selectedTab, campSiteWeather, handleSelectTab } =
    useCampSiteDetailTabState(spot);

  const handlePressClose = () => {
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

  if (!spot) {
    return null;
  }

  return (
    <>
      <View style={styles.container}>
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
  tabContent: {
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
