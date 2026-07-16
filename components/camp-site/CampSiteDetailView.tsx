import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteBagSelectSheetView from './CampSiteBagSelectSheetView';
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
        <View style={styles.header}>
          {/* 상세는 지도 위 바텀 시트(CS-2)라 뒤로 가기가 아니라 닫기(X)를 둔다. */}
          <TouchableOpacity
            onPress={handlePressClose}
            style={styles.closeButton}
            accessibilityLabel='닫기'
            accessibilityRole='button'
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>

          {/* 헤더 우측 액션 — (지도 진입 시) 위치로 이동 + 공유 + 네이버 지도에서 열기(CS-2/CS-3/CS-7) */}
          <View style={styles.headerRight}>
            {onMoveToSpot ? (
              <TouchableOpacity
                onPress={handlePressMoveToSpot}
                style={styles.headerButton}
                accessibilityLabel='지도에서 이 박지 위치로 이동'
                accessibilityRole='button'
              >
                <Ionicons name='locate' size={22} color={Color.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handlePressShare}
              style={styles.headerButton}
              accessibilityLabel='공유'
              accessibilityRole='button'
            >
              <Ionicons
                name='share-outline'
                size={22}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePressNaverMap}
              style={styles.headerButton}
              accessibilityLabel='네이버 지도에서 열기'
              accessibilityRole='button'
            >
              <Ionicons name='map-outline' size={22} color={Color.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 이름·유형 배지·지역은 탭과 무관한 박지 정체성이라 고정 영역에 둔다(CS-3). */}
        <View style={styles.titleBlock}>
          <View style={styles.titleRow}>
            <PretendardText style={styles.name} weight='bold'>
              {spot.name}
            </PretendardText>
            <View style={styles.typeBadge}>
              <PretendardText style={styles.typeBadgeText} weight='semibold'>
                {getCampSiteTypeLabel(spot.type)}
              </PretendardText>
            </View>
          </View>
          <PretendardText style={styles.region}>{spot.region}</PretendardText>
        </View>

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
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  // 헤더 우측 액션 묶음(위치로 이동 + 공유 + 지도) — 닫기 대칭 위치.
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: -10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  typeBadge: {
    backgroundColor: Color.chipInactiveBg,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  region: {
    fontSize: 14,
    color: Color.textSecondary,
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
