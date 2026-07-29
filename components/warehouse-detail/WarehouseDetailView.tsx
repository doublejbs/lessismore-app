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
import { Stack } from 'expo-router';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailBasicInfoView from './WarehouseDetailBasicInfoView';
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
import { Color, Radius } from '@/constants/DesignTokens';
import SearchGearAddToBagModalView from '../search/SearchGearAddToBagModalView';
import Bag from '@/model/bag/Bag';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 스크롤 타이틀 노출 임계 보정 — 정보 섹션 하단에서 헤더 1행(~44pt)+여유만큼 앞당김.
const HEADER_TITLE_REVEAL_MARGIN = 88;
// onLayout 측정 전 폴백 (정보 섹션 대략 높이). 실제 높이는 사진(GD-13) 유무로 갈리는데
// — 사진이 있으면 2열이라 100pt 남짓, 없으면 `사진 추가` 행만큼 — 폴백은 첫 프레임에만 쓰이고
// onLayout이 곧 실측값으로 덮으므로 사진 없는 기본 모습 기준의 보수적인 값을 둔다.
const INFO_HEIGHT_FALLBACK = 200;
// 헤더 타이틀 좌우 인셋 — 뒤로가기/수정하기 액션과 겹침 방지.
const HEADER_TITLE_INSET = 60;
// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();
  const showAddToBagModal = warehouseDetail.shouldShowAddToBagModal();
  const [bag] = useState(() => Bag.new());
  const [loading, setLoading] = useState(false);
  const [showHeaderTitle, setShowHeaderTitle] = useState(false);
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
    // GE-8: 배낭 컨텍스트면 '이 배낭에 담기'(이미 그 배낭에 담김이면 버튼 숨김), 아니면 창고 미보유 시 '내 창고에 추가'.
    const isBagContext = warehouseDetail.isBagContext();
    const showAddButton = isBagContext
      ? !warehouseDetail.isInBagContextBag()
      : !isAdded;

    // 헤더 우측 액션(공유·수정) — iOS 네이티브 headerRight와 Android/Web 커스텀 헤더가 공유한다.
    const renderHeaderActions = () => (
      <>
        {/* 공유(GD-7) — 카탈로그 장비만(커스텀은 웹 랜딩 대상이 아님) */}
        {!gear.getIsCustom() && (
          <TouchableOpacity
            onPress={handlePressShare}
            style={styles.headerIconButton}
            accessibilityLabel='공유'
            accessibilityRole='button'
          >
            <Ionicons name='share-outline' size={22} color={Color.textPrimary} />
          </TouchableOpacity>
        )}
        {isAdded && (
          <TouchableOpacity
            onPress={handlePressEdit}
            style={styles.editButton}
            accessibilityLabel='수정하기'
            accessibilityRole='button'
          >
            <PretendardText style={styles.editButtonText}>
              수정하기
            </PretendardText>
          </TouchableOpacity>
        )}
      </>
    );

    return (
      <>
        {/* LG-1: iOS만 네이티브 투명 헤더 — 글래스 back(원형 chevron)·scroll edge effect는
            시스템에 위임한다(headerBlurEffect·headerStyle.backgroundColor 지정 금지).
            타이틀은 시스템 폰트의 일반(스몰) 타이틀로 항상 표시된다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: gear.getDisplayName(),
            headerBackButtonDisplayMode: 'minimal',
            headerRight: () => (
              <View style={styles.nativeHeaderRight}>
                {renderHeaderActions()}
              </View>
            ),
          }}
        />
        <View style={styles.container}>
          {!IS_IOS && (
            <View style={styles.header}>
              <TouchableOpacity
                onPress={handlePressClose}
                style={styles.backButton}
                accessibilityLabel='뒤로 가기'
                accessibilityRole='button'
              >
                <Ionicons
                  name='chevron-back'
                  size={24}
                  color={Color.textPrimary}
                />
              </TouchableOpacity>
              {showHeaderTitle && (
                <View style={styles.headerTitleContainer} pointerEvents='none'>
                  <PretendardText
                    weight='semibold'
                    numberOfLines={1}
                    style={styles.headerTitle}
                  >
                    {gear.getDisplayName()}
                  </PretendardText>
                </View>
              )}
              <View style={styles.headerRight}>{renderHeaderActions()}</View>
            </View>
          )}
          <ScrollView
            style={styles.content}
            // iOS: 콘텐츠가 투명 헤더 뒤로 흐르되(edge-to-edge) 첫 콘텐츠는 시스템이 자동 인셋.
            contentInsetAdjustmentBehavior='automatic'
            // 스크롤 시 타이틀 노출은 커스텀 헤더(Android/Web) 전용 — iOS는 네이티브 타이틀 상시 표시.
            onScroll={IS_IOS ? undefined : handleScroll}
            scrollEventThrottle={16}
          >
            {/* 기본 정보 섹션(GD-1). 보유 장비는 사진 유무로 레이아웃이 갈리므로(2열/1열)
                업로드 상태를 가진 BasicInfoView가 조립까지 맡고, 카탈로그 장비는 저장할 문서가
                없어 업로드 UI 없이 정보 뷰만 그린다(GD-13).
                헤더 타이틀 노출 임계는 이 영역까지 포함해 측정해야 어긋나지 않는다. */}
            <View onLayout={handleInfoLayout}>
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
                {/* 사용 지표 히어로(GD-9) */}
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
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {showAddButton && (
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[styles.addButton, loading && styles.disabledButton]}
                onPress={handleAddPress}
                disabled={loading}
              >
                {loading ? (
                  <LoadingView duration={1000} />
                ) : (
                  <View style={styles.buttonContent}>
                    <PretendardText weight='semibold' style={styles.addButtonText}>
                      {isBagContext ? '이 배낭에 담기' : '내 창고에 추가하기'}
                    </PretendardText>
                  </View>
                )}
              </TouchableOpacity>
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
    backgroundColor: Color.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  backButton: {
    // HIG 최소 터치 타깃 44×44pt, 아이콘 중앙 정렬 (헤더 좌측 정렬 유지)
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    // 터치 영역 확대로 밀린 아이콘 시각 위치를 콘텐츠 좌측 정렬선(20px)에 복원
    marginLeft: -10,
  },
  headerTitleContainer: {
    // 좌/우 액션(뒤로가기·수정하기)과 겹치지 않게 중앙 영역만 차지
    position: 'absolute',
    left: HEADER_TITLE_INSET,
    right: HEADER_TITLE_INSET,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    color: Color.textPrimary,
  },
  // 헤더 우측 액션 묶음(공유 + 수정).
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -10,
  },
  // iOS 네이티브 headerRight 컨테이너 — 공유·수정 버튼 가로 배치(바 안 정렬은 시스템에 위임).
  nativeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    // 시스템 바 버튼 그룹 지오메트리에 맞춘 간격 — 44pt 박스(내부 여백 ~11pt) + gap 8
    // = 아이콘 중심 간격 ~52pt(iOS 26 표준 캡슐과 동일).
    gap: 8,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    // HIG 최소 터치 타깃 44pt, 우측 정렬선(20px) 복원
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 4,
  },
  editButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  content: {
    flexDirection: 'column',
  },
  bottomSpacing: {
    height: 100,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: Color.background,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  addButton: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: Color.background,
    fontSize: 16,
  },
});

export default observer(WarehouseDetailView);
