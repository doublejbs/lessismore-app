import { FC, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { observer } from 'mobx-react-lite';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import LoadingView from '@/components/ui/LoadingView';
import { Liquid, LiquidBackdrop, LiquidLayout } from '@/constants/DesignTokens';
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
// 탭 바 뷰의 컨테이너는 이미 불투명 지면색(Liquid.canvas)을 가져 고정 시 뒤 콘텐츠가 비치지 않는다.
const TAB_BAR_INDEX = 1;

// 하단 고정 CTA가 스크롤 마지막 콘텐츠를 가리지 않도록 확보하는 여유(버튼 높이 약 84 + 여유).
const CTA_CLEARANCE = 96;

// CTA 진행 표시 회전 주기(창고 장비 상세 CTA와 같은 값).
const SPINNER_DURATION = 1000;

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
            여행지 허브에서 연 상세는 이미 이 배낭의 여행지라 이 버튼을 숨긴다(DST-8).
            **앱에서 라임을 주 액션에 쓰는 유일한 자리다**(핸드오프 §10). */}
        {showSetBag ? (
          <View style={styles.bottomBar} pointerEvents='box-none'>
            {/* 불투명 띠 대신 지면색 그라디언트로 받는다 — 띠를 두면 버튼 주위에 각진 면이
                생겨 콘텐츠가 그 뒤에서 잘려 보인다. */}
            <LinearGradient
              colors={LiquidBackdrop.ctaVeil.colors}
              locations={LiquidBackdrop.ctaVeil.locations}
              style={StyleSheet.absoluteFill}
              pointerEvents='none'
            />
            {/* 저장 중에도 라벨을 유지하고 앞에 진행 표시만 붙인다 — 라벨이 사라지면 무엇을
                기다리는지 알 수 없다. 스피너는 창고 장비 상세의 CTA와 같은 컴포넌트다. */}
            <LiquidPillButton
              label='배낭 여행지로 설정'
              variant='accent'
              block
              disabled={settingBag}
              busy={settingBag}
              onPress={handlePressSetBag}
              {...(settingBag
                ? {
                    leading: (
                      <View style={styles.ctaSpinner}>
                        <LoadingView
                          duration={SPINNER_DURATION}
                          color={Liquid.limeOn}
                        />
                      </View>
                    ),
                  }
                : {
                    trailing: (
                      <Ionicons
                        name='arrow-forward'
                        size={17}
                        color={Liquid.limeOn}
                      />
                    ),
                  })}
            />
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
  // 시트 지면. 네이티브 시트가 상단 모서리(radius 28)와 그림자를 그리고, 이 면이 그 안을 채운다.
  container: {
    flex: 1,
    backgroundColor: Liquid.canvas,
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
  /**
   * 콘텐츠가 이 아래로 흐르도록 절대 배치한다 — 흐르지 않으면 위 그라디언트가 지면 위 지면을
   * 덮는 셈이라 아무것도 끊지 않는다(창고 장비 상세 CTA와 같은 구조).
   * 스크롤 끝은 `CTA_CLEARANCE`가 비워 둔다.
   */
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 14,
    // 시트는 이미 홈 인디케이터 위로 떠 있어 하단 세이프에어리어를 더하지 않는다(CS-3).
    paddingBottom: 16,
  },
  // LoadingView는 flex:1로 자리를 다 먹으므로 칸에 담아 라벨을 밀지 않게 한다.
  // 24는 LoadingView 내부 SVG 크기 — 더 작게 주면 스피너가 칸에 잘린다.
  ctaSpinner: {
    width: 24,
    height: 24,
  },
});

export default observer(CampSiteDetailView);
