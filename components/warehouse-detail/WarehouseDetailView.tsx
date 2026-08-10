import { FC, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  GestureResponderEvent,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailBasicInfoView from './WarehouseDetailBasicInfoView';
import WarehouseDetailChromeView, {
  HEADER_ICON_BOX,
} from './WarehouseDetailChromeView';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailSpecsView from './WarehouseDetailSpecsView';
import WarehouseDetailPurchaseView from './WarehouseDetailPurchaseView';
import WarehouseDetailUsageHeroView from './WarehouseDetailUsageHeroView';
import WarehouseDetailDeclutterBannerView from './WarehouseDetailDeclutterBannerView';
import WarehouseDetailActivityTotalsView from './WarehouseDetailActivityTotalsView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from './WarehouseDetailReviewSectionView';
import WarehouseDetailExternalReviewView from './WarehouseDetailExternalReviewView';
import LoadingView from '@/components/ui/LoadingView';
import PretendardText from '../PretendardText';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidBackdrop,
  LiquidLayout,
  LiquidMotion,
} from '@/constants/DesignTokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchGearAddToBagModalView from '../search/SearchGearAddToBagModalView';
import Bag from '@/model/bag/Bag';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 스크롤 타이틀 노출 임계 보정 — 정보 섹션 하단에서 헤더 1행(~44pt)+여유만큼 앞당김.
const HEADER_TITLE_REVEAL_MARGIN = 88;
// onLayout 측정 전 폴백 (정보 섹션 대략 높이). 실제 높이는 사진(GD-13) 유무로 갈리는데
// — 사진이 있으면 140pt 줄이 더 붙고, 없으면 `사진 추가` 행만큼 — 폴백은 첫 프레임에만 쓰이고
// onLayout이 곧 실측값으로 덮으므로 사진 없는 기본 모습 기준의 보수적인 값을 둔다.
const INFO_HEIGHT_FALLBACK = 200;
// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 그린다.
const IS_IOS = Platform.OS === 'ios';

// 투명 네이티브 헤더 높이(상태바 제외). `contentInsetAdjustmentBehavior='automatic'`은
// 스크롤 뷰가 화면의 첫 자식일 때만 적용되는데, 지면 배경(LiquidBackdrop)이 앞에
// 깔리면서 그 조건이 깨져 첫 항목이 헤더 뒤로 숨었다(2026-08-03 실기기 확인).
// 자동 인셋을 끄고 헤더 높이를 직접 비운다.
const NATIVE_HEADER_HEIGHT = LiquidLayout.navBar;

// 하단 고정 CTA 블록이 먹는 높이(위 여백 12 + 알약 54 + 아래 여백 10) + 마지막 카드가
// 그라디언트에 물리지 않을 여유. 세이프에어리어는 Layout이 이미 비워 둔다.
const BOTTOM_CTA_CLEARANCE = 12 + LiquidLayout.pillHeight + 10 + 24;
// CTA가 없는 화면(이미 보유한 장비)에서 마지막 섹션이 화면 밑변에 붙지 않을 여백.
const SCROLL_BOTTOM = 24;
// 인플라이트 스피너 한 바퀴 — 담기 CTA(LiquidAddCta)와 같은 값.
const SPINNER_DURATION = 1000;
/**
 * Android·Web 캡슐 안 액션의 터치 여유 — 아이콘 칸(34)을 캡슐 높이(38)까지 넓힌다.
 * 44를 못 채우는 건 지오메트리가 아니라 구조 때문이다: `LiquidGlassCapsule`의 겉면이
 * 알약으로 클리핑해(`overflow: 'hidden'`) 그 밖으로 나간 히트 영역이 전달되지 않는다.
 * 창고 헤더(`WarehouseChromeView.ICON_HIT_SLOP`)와 같은 값·같은 이유다(GD-1·LG-3).
 * 가로는 0 — 좌우로 넓히면 캡슐 안 두 액션의 히트 영역이 겹친다.
 */
const ACTION_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

/**
 * GD-1 장비 상세 화면 (Liquid Depth, 목업 §9).
 *
 * 지면은 지형 없이 좌측 라임 글로우만 있는 `canvas`다(래퍼가 깐다) — 여기는 읽을 지형이
 * 아니라 하나의 장비를 판단하는 화면이다. 크롬은 지면 위에 뜬 유리(뒤로가기·공유·수정),
 * 화면 대상은 **장비 이름**(28/36)이고 시각 앵커는 우측 무게(Archivo 42)다.
 * 섹션은 큰 제목 대신 대문자 마이크로 라벨로 열고, 주 액션 하나(`내 창고에 추가하기`)만
 * 하단에 고정해 지면색 그라디언트로 받친다.
 */
const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();
  const showAddToBagModal = warehouseDetail.shouldShowAddToBagModal();
  const [bag] = useState(() => Bag.new());
  const [loading, setLoading] = useState(false);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
  const insets = useSafeAreaInsets();
  const infoHeightRef = useRef(0);

  const handlePressClose = () => {
    warehouseDetail.close();
  };

  const handleInfoLayout = (event: LayoutChangeEvent) => {
    infoHeightRef.current = event.nativeEvent.layout.height;
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;

    // 정보 섹션이 헤더 아래로 대부분 사라진 시점에서 타이틀 노출.
    const threshold =
      infoHeightRef.current > 0
        ? infoHeightRef.current - HEADER_TITLE_REVEAL_MARGIN
        : INFO_HEIGHT_FALLBACK;
    const shouldShow = offsetY > threshold;

    if (shouldShow !== showHeaderTitle) {
      setShowHeaderTitle(shouldShow);
    }
  };

  const handlePressEdit = () => {
    app.getAnalyticsManager()?.logClick('gear_edit');
    warehouseDetail.edit();
  };

  const handlePressShare = () => {
    void warehouseDetail.share();
  };

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!gear) {
      return;
    }

    setLoading(true);
    try {
      // GE-8: 배낭 컨텍스트면 그 배낭에 바로 담고, 아니면 창고 등록(후 배낭 담기 모달).
      if (warehouseDetail.isBagContext()) {
        await warehouseDetail.addToBag(gear);
      } else {
        await warehouseDetail.addToWarehouse(gear);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    warehouseDetail.closeAddToBagModal();
  };

  if (gear) {
    const isAdded = gear.isAdded();
    // GD-1: 스크롤이 정체 블록을 지나면 제품명이 헤더에 나타난다 — 최상단에서는 본문 이름
    // (28/36)이 화면 대상이라 바에 같은 말을 또 두지 않는다(목업 §9 헤더에 타이틀 없음).
    // iOS 네이티브 헤더와 Android·Web 유리 크롬이 **이 한 값**을 나눠 쓴다.
    const headerTitle = showHeaderTitle ? gear.getDisplayName() : undefined;
    // 공유(카탈로그 장비만 — GD-7)·수정(보유 장비만) 둘 다 빠지면 액션 자리를 아예 비운다.
    // 넘겨도 되는 빈 컨테이너를 넘기면 Android·Web에서 누를 것 없는 유리 캡슐이 남는다.
    const hasHeaderActions = !gear.getIsCustom() || isAdded;
    // GE-8: 배낭 컨텍스트면 '이 배낭에 담기'(이미 그 배낭에 담김이면 버튼 숨김), 아니면 창고 미보유 시 '내 창고에 추가'.
    const isBagContext = warehouseDetail.isBagContext();
    const showAddButton = isBagContext
      ? !warehouseDetail.isInBagContextBag()
      : !isAdded;

    // 헤더 우측 액션(공유·수정) — iOS 네이티브 headerRight와 Android/Web 유리 캡슐이 공유한다.
    // 각 액션을 칸에 담아 캡슐의 내부 여백·아이콘 중심 간격을 맞춘다. iOS는 시스템 바 버튼
    // 지오메트리(44pt 칸)에, Android/Web은 목업 §9 캡슐(34pt 칸)에 맞춘다.
    const renderHeaderActions = () => (
      <View style={styles.headerActions}>
        {/* 공유(GD-7) — 카탈로그 장비만(커스텀은 웹 랜딩 대상이 아님) */}
        {!gear.getIsCustom() && (
          <TouchableOpacity
            onPress={handlePressShare}
            style={IS_IOS ? styles.headerIconBoxIos : styles.headerIconBox}
            activeOpacity={LiquidMotion.pressOpacity}
            // iOS 칸은 이미 44라 여유가 필요 없다 — 캡슐 안(34)만 넓힌다.
            {...(IS_IOS ? {} : { hitSlop: ACTION_HIT_SLOP })}
            accessibilityLabel='공유'
            accessibilityRole='button'
          >
            <Ionicons name='share-outline' size={20} color={Liquid.ink} />
          </TouchableOpacity>
        )}
        {isAdded && (
          <TouchableOpacity
            onPress={handlePressEdit}
            style={IS_IOS ? styles.editButtonIos : styles.editButton}
            activeOpacity={LiquidMotion.pressOpacity}
            {...(IS_IOS ? {} : { hitSlop: ACTION_HIT_SLOP })}
            accessibilityLabel='수정하기'
            accessibilityRole='button'
          >
            <PretendardText weight='semibold' style={styles.editButtonText}>
              수정
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
    );

    return (
      <>
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
            시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
            타이틀은 스크롤이 정체 블록을 지날 때만 채운다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            // 네이티브 헤더는 빈 문자열로 비운다 — `undefined`면 라우트 기본 타이틀로 되돌아간다.
            headerTitle: headerTitle ?? '',
            headerBackButtonDisplayMode: 'minimal',
            ...(hasHeaderActions
              ? { headerRight: () => renderHeaderActions() }
              : {}),
          }}
        />
        <View style={styles.container}>
          {!IS_IOS && (
            <WarehouseDetailChromeView
              onPressBack={handlePressClose}
              {...(hasHeaderActions ? { actions: renderHeaderActions() } : {})}
              title={headerTitle}
            />
          )}
          <ScrollView
            style={styles.content}
            contentContainerStyle={[
              IS_IOS ? { paddingTop: insets.top + NATIVE_HEADER_HEIGHT } : null,
              {
                paddingBottom: showAddButton
                  ? BOTTOM_CTA_CLEARANCE
                  : SCROLL_BOTTOM,
              },
            ]}
            contentInsetAdjustmentBehavior='never'
            onScroll={handleScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
          >
            {/* 기본 정보 섹션(GD-1). 보유 장비는 사진 업로드 상태를 가진 BasicInfoView가
                조립까지 맡고, 카탈로그 장비는 저장할 문서가 없어 업로드 UI 없이 정보 뷰만
                그린다(GD-13). 헤더 타이틀 노출 임계는 이 영역까지 포함해 측정해야 어긋나지 않는다. */}
            <View style={styles.infoBlock} onLayout={handleInfoLayout}>
              {/* key로 장비가 바뀌면 GearImageUpload를 확실히 재생성한다 — 모델이 진입 시점
                  URL로 한 번만 씨를 받으므로(useState 초기화) 같은 자리에 다른 장비가 들어오면
                  이전 장비의 사진이 그대로 남는다. */}
              {isAdded ? (
                <WarehouseDetailBasicInfoView key={gear.getId()} gear={gear} />
              ) : (
                <WarehouseDetailInformationView gear={gear} />
              )}
            </View>
            {/* 카테고리별 스펙 표(GD-8) — 기본 정보 아래, 배낭 기록/최저가 위 */}
            <WarehouseDetailSpecsView gear={gear} />
            {isAdded && (
              // 보유(관리) 모드: 사용 인사이트(GD-9~12) → 배낭 기록을 최저가 링크보다 위로 (GD-5)
              <>
                {/* 사용 지표 히어로(GD-9) — 화면의 라임 면 하나가 여기 있다. */}
                <WarehouseDetailUsageHeroView
                  warehouseDetail={warehouseDetail}
                />
                {/* 덜어내기 시그널(GD-12) — 히어로 바로 아래, 조건 충족 시에만 */}
                <WarehouseDetailDeclutterBannerView
                  warehouseDetail={warehouseDetail}
                />
                {/* 함께한 활동 누적(GD-11) — 운동 기록 있는 사용 여행이 있을 때만 */}
                <WarehouseDetailActivityTotalsView
                  warehouseDetail={warehouseDetail}
                />
                {/* 함께한 여행 타임라인(GD-10) */}
                <WarehouseDetailBagRecordView
                  gear={gear}
                  warehouseDetail={warehouseDetail}
                />
              </>
            )}
            <WarehouseDetailPurchaseView warehouseDetail={warehouseDetail} />
            {/* 외부 후기(GD-6)는 보유 여부로 배치 분기 — 미보유(쇼핑 맥락)는
                구매 판단에 유용한 외부 후기를 리뷰(댓글)보다 위로 올린다. */}
            {isAdded ? (
              <>
                <WarehouseDetailReviewSectionView
                  warehouseDetail={warehouseDetail}
                />
                <WarehouseDetailExternalReviewView
                  warehouseDetail={warehouseDetail}
                />
              </>
            ) : (
              <>
                <WarehouseDetailExternalReviewView
                  warehouseDetail={warehouseDetail}
                />
                <WarehouseDetailReviewSectionView
                  warehouseDetail={warehouseDetail}
                />
              </>
            )}
          </ScrollView>

          {showAddButton && (
            // 지면색 그라디언트가 콘텐츠와 CTA 사이를 끊는다(목업 §9) — 불투명 띠를 두면
            // 버튼 주위에 각진 면이 생겨 카드가 그 뒤에서 잘려 보인다.
            <View style={styles.bottomBar} pointerEvents='box-none'>
              <LinearGradient
                colors={
                  LiquidBackdrop.ctaVeil.colors as unknown as [string, string]
                }
                locations={
                  LiquidBackdrop.ctaVeil.locations as unknown as [
                    number,
                    number,
                  ]
                }
                style={StyleSheet.absoluteFill}
                pointerEvents='none'
              />
              <LiquidPillButton
                label={isBagContext ? '이 배낭에 담기' : '내 창고에 추가하기'}
                block
                disabled={loading}
                onPress={handleAddPress}
                {...(loading
                  ? {
                      leading: (
                        <View style={styles.ctaSpinner}>
                          <LoadingView
                            duration={SPINNER_DURATION}
                            color={Liquid.lime}
                          />
                        </View>
                      ),
                    }
                  : {})}
              />
            </View>
          )}
        </View>
        <SearchGearAddToBagModalView
          visible={showAddToBagModal}
          onClose={handleCloseModal}
          gear={gear}
          bag={bag}
        />
      </>
    );
  } else {
    return null;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 지면은 래퍼의 LiquidBackdrop이 깐다 — 여기 면을 두면 그 위를 덮는다.
    backgroundColor: 'transparent',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Android/Web 유리 캡슐 안 칸(목업 §9). 아이콘 중심 간격 36 = 34 + 캡슐 gap 2.
  headerIconBox: {
    width: HEADER_ICON_BOX,
    height: HEADER_ICON_BOX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // iOS 시스템 바 버튼 지오메트리(내부 ~11pt, 아이콘 중심 간격 ~52pt, 높이 44pt).
  headerIconBoxIos: {
    width: LiquidLayout.touchMin,
    height: LiquidLayout.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `수정`은 글자라 칸 폭을 글자에 맞추고 좌우 여백만 준다(목업 §9: 높이 34 · 좌우 8).
  editButton: {
    height: HEADER_ICON_BOX,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonIos: {
    minHeight: LiquidLayout.touchMin,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 14,
    color: Liquid.ink,
  },
  content: {
    flexDirection: 'column',
  },
  // 정체 블록과 첫 섹션 사이. 사진 유무·보유 여부와 무관하게 이 래퍼가 한 곳에서 든다 —
  // 두 분기가 각자 여백을 가지면 값이 갈린다. 목업 §9는 여기만 24였지만 화면 안에서
  // 섹션 간격이 두 값으로 갈리므로 공용 `LiquidLayout.section`(26)으로 맞춘다.
  infoBlock: {
    marginBottom: LiquidLayout.section,
  },
  // 스크롤 콘텐츠 **위에 떠 있는** 주 액션. 세로 여백은 목업 §9의 `12px 20px`이고
  // 하단 34는 세이프에어리어(Layout)가 이미 비워 두므로 그 위에 얹는 10만 준다.
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: LiquidLayout.screenH,
  },
  // LoadingView는 flex:1로 자리를 다 먹으므로 칸에 담아 라벨을 밀지 않게 한다.
  ctaSpinner: {
    width: 20,
    height: 20,
  },
});

export default observer(WarehouseDetailView);
