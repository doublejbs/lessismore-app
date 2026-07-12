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
} from 'react-native';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailPurchaseView from './WarehouseDetailPurchaseView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from './WarehouseDetailReviewSectionView';
import WarehouseDetailExternalReviewView from './WarehouseDetailExternalReviewView';
import LoadingView from '@/components/ui/LoadingView';
import PretendardText from '../PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import SearchGearAddToBagModalView from '../search/SearchGearAddToBagModalView';
import SharedImageSelectionModalView from '../gear-image/SharedImageSelectionModalView';
import Bag from '@/model/bag/Bag';
import GearImageType from '@/model/gear/GearImageType';
import app from '@/model/app/App';

interface Props {
  warehouseDetail: WarehouseDetail;
}

// 스크롤 타이틀 노출 임계 보정 — 정보 섹션 하단에서 헤더 1행(~44pt)+여유만큼 앞당김.
const HEADER_TITLE_REVEAL_MARGIN = 88;
// onLayout 측정 전 폴백 (이미지+정보 대략 높이).
const INFO_HEIGHT_FALLBACK = 360;
// 헤더 타이틀 좌우 인셋 — 뒤로가기/수정하기 액션과 겹침 방지.
const HEADER_TITLE_INSET = 60;

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();
  const showAddToBagModal = warehouseDetail.shouldShowAddToBagModal();
  const gearImageSelection = warehouseDetail.getGearImageSelection();
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

  const handleSelectOtherImage = () => {
    app.getAnalyticsManager()?.logClick('gear_photo_change');
    gearImageSelection?.showModal();
  };

  const handleCloseImageModal = () => {
    gearImageSelection?.hideModal();
  };

  const handleSelectImage = (image: GearImageType) => {
    warehouseDetail.selectSharedImage(image);
  };

  const handleUploadComplete = () => {
    gearImageSelection?.loadImages();
  };

  const handlePressEdit = () => {
    app.getAnalyticsManager()?.logClick('gear_edit');
    warehouseDetail.edit();
  };

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!gear) {
      return;
    }

    setLoading(true);
    try {
      await warehouseDetail.addToWarehouse(gear);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    warehouseDetail.closeAddToBagModal();
  };

  if (gear) {
    const isAdded = gear.isAdded();

    return (
      <>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={handlePressClose}
              style={styles.backButton}
              accessibilityLabel='뒤로 가기'
              accessibilityRole='button'
            >
              <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
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
          </View>
          <ScrollView
            style={styles.content}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View onLayout={handleInfoLayout}>
              <WarehouseDetailInformationView
                gear={gear}
                canShowSharedImages={gearImageSelection?.canShowSharedImages()}
                onSelectOtherImage={handleSelectOtherImage}
              />
            </View>
            {isAdded && (
              // 보유(관리) 모드: 내 배낭 기록을 최저가 링크보다 위로 (GD-5)
              <WarehouseDetailBagRecordView
                gear={gear}
                warehouseDetail={warehouseDetail}
              />
            )}
            <WarehouseDetailPurchaseView warehouseDetail={warehouseDetail} />
            <WarehouseDetailReviewSectionView
              warehouseDetail={warehouseDetail}
            />
            {/* 외부 후기(GD-6) — 유튜브·네이버 블로그 */}
            <WarehouseDetailExternalReviewView
              warehouseDetail={warehouseDetail}
            />
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {!isAdded && (
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
                      내 창고에 추가하기
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
        {gearImageSelection && gear && (
          <SharedImageSelectionModalView
            visible={gearImageSelection.isModalVisible()}
            gearId={gear.getId()}
            images={gearImageSelection.getImages()}
            loading={gearImageSelection.isLoading()}
            selectedImageUrl={gear.getImageUrl()}
            onClose={handleCloseImageModal}
            onSelectImage={handleSelectImage}
            onUploadComplete={handleUploadComplete}
          />
        )}
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
  editButton: {
    // HIG 최소 터치 타깃 44pt, 우측 정렬선(20px) 복원
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -4,
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
