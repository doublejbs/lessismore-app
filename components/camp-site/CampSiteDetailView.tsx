import { FC, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, Color, Radius } from '@/constants/DesignTokens';
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
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';

interface Props {
  campSiteDetail: CampSiteDetail;
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onMoveToSpot?: (() => void) | undefined;
  // 오버레이(DST-3)에서 열렸을 때 닫기 동작 — 라우터 대신 오버레이 모달을 닫는다.
  // 없으면 기존대로 campSiteDetail.close()(router.back)를 쓴다.
  onClose?: (() => void) | undefined;
  // 배낭 여행지로 설정 동작 오버라이드(DST-3) — 여행지 선택기에서 연 상세는
  // 배낭 리스트를 열지 않고 현재 배낭에 바로 설정한다(= 이 박지로 설정).
  // 저장이 끝날 때까지 CTA가 로딩을 표시하도록 Promise를 반환한다.
  // 없으면 기존대로 배낭 선택 시트를 연다(지도 탭 진입, CS-5).
  onSetBag?: (() => Promise<void>) | undefined;
  // 배낭 여행지로 설정 CTA 노출 여부(기본 true). 여행지 허브에서 연 상세는
  // 이미 이 배낭의 여행지라 설정 버튼이 필요 없어 숨긴다(DST-8).
  showSetBag?: boolean | undefined;
}

// stickyHeaderIndices는 ScrollView 직계 자식 기준. 상단 블록(0) → 탭 바(1) → 탭 콘텐츠(2)라
// 탭 바 인덱스는 1이며, 위로 스크롤될 때 상단에 고정(sticky)된다(CS-3).
// 탭 바 뷰의 컨테이너는 이미 불투명 배경(Color.background)을 가져 고정 시 뒤 콘텐츠가 비치지 않는다.
const TAB_BAR_INDEX = 1;

// 하단 고정 CTA가 스크롤 마지막 콘텐츠를 가리지 않도록 확보하는 여유(버튼 높이 약 84 + 여유).
const CTA_CLEARANCE = 96;

// 박지 상세 시트(CS-3) — 상단 블록·탭 바·탭 콘텐츠가 하나의 세로 스크롤 안에 있고,
// 탭 바만 sticky로 상단에 붙는다. 주 액션(배낭 여행지로 설정)만 하단에 고정한다.
// 하나의 스크롤 + 고정 CTA 구조라 detent별 peek 접기·높이 측정 로직은 두지 않는다(CS-2).
const CampSiteDetailView: FC<Props> = ({
  campSiteDetail,
  onMoveToSpot,
  onClose,
  onSetBag,
  showSetBag = true,
}) => {
  const spot = campSiteDetail.getSpot();
  const showBagSheet = campSiteDetail.shouldShowBagSheet();
  // 선택기에서 연 상세의 `배낭 여행지로 설정` 저장 진행 상태(DST-3).
  const [settingBag, setSettingBag] = useState(false);
  // 저장 성공 시 시트가 언마운트되므로, 언마운트 뒤 setState를 피하려 마운트 여부를 들고 있는다.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

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

  const handlePressFavorite = () => {
    void campSiteDetail.toggleFavorite();
  };

  // 선택기 경로(onSetBag)는 Firestore 저장이 끝나야 시트가 닫히므로 그동안 CTA를 로딩으로
  // 바꾼다. 배낭 선택 시트를 여는 기본 경로는 즉시 끝나 로딩이 필요 없다(CS-5).
  const handlePressSetBag = async () => {
    if (!onSetBag) {
      void campSiteDetail.openBagSheet();

      return;
    }

    if (settingBag) {
      return;
    }

    setSettingBag(true);

    try {
      await onSetBag();
    } finally {
      // 성공하면 시트가 곧 언마운트되지만, 실패 시엔 이 시트가 남아 재시도할 수 있어야 한다(DST-6).
      if (mountedRef.current) {
        setSettingBag(false);
      }
    }
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
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={
            showSetBag ? styles.scrollContentWithCta : undefined
          }
          stickyHeaderIndices={[TAB_BAR_INDEX]}
          showsVerticalScrollIndicator={false}
        >
          {/* 상단 블록: 닫기(X)·이름·유형/지역·설명·기능 버튼·대표 사진(CS-3). */}
          <CampSiteDetailHeaderView
            name={spot.name}
            typeLabel={getCampSiteTypeLabel(spot.type)}
            region={getCampSpotRegionLabel(spot)}
            description={spot.description}
            imageUrl={spot.imageUrl}
            isFavorite={campSiteDetail.isFavorite()}
            onPressFavorite={handlePressFavorite}
            onPressMoveToSpot={onMoveToSpot ? handlePressMoveToSpot : undefined}
            onPressShare={handlePressShare}
            onPressNaverMap={handlePressNaverMap}
            onPressClose={handlePressClose}
          />

          {/* 탭 바(index=TAB_BAR_INDEX) — 사진까지 밀어 올려도 상단에 고정돼 탭 전환이 가능하다(CS-3). */}
          <CampSiteDetailTabBarView
            selectedTab={selectedTab}
            onSelectTab={handleSelectTab}
          />

          {/* 탭 콘텐츠 — 별도 중첩 스크롤 없이 바깥 스크롤에 이어 그린다(CS-3). */}
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
        </ScrollView>

        {/* 박지 단위의 주 액션이라 어느 탭·스크롤 위치에서도 닿도록 하단에 고정한다(CS-3/CS-5).
            여행지 허브에서 연 상세는 이미 이 배낭의 여행지라 이 버튼을 숨긴다(DST-8). */}
        {showSetBag ? (
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[
                styles.setBagButton,
                settingBag && styles.setBagButtonDisabled,
              ]}
              onPress={handlePressSetBag}
              disabled={settingBag}
              activeOpacity={0.7}
              accessibilityLabel='배낭 여행지로 설정'
              accessibilityRole='button'
              accessibilityState={{ disabled: settingBag, busy: settingBag }}
            >
              {settingBag ? (
                <ActivityIndicator color={Color.background} />
              ) : (
                <PretendardText
                  style={styles.setBagButtonText}
                  weight='semibold'
                >
                  배낭 여행지로 설정
                </PretendardText>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
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
    backgroundColor: Acg.bg,
  },
  scroll: {
    flex: 1,
  },
  // CTA가 있으면 마지막 콘텐츠가 그 뒤에 가리지 않게 하단 여유를 준다.
  scrollContentWithCta: {
    paddingBottom: CTA_CLEARANCE,
  },
  tabContent: {
    paddingBottom: 12,
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
  setBagButtonDisabled: {
    opacity: 0.6,
  },
  setBagButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default observer(CampSiteDetailView);
