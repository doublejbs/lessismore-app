import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailPurchaseView from './WarehouseDetailPurchaseView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from './WarehouseDetailReviewSectionView';
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

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();
  const showAddToBagModal = warehouseDetail.shouldShowAddToBagModal();
  const gearImageSelection = warehouseDetail.getGearImageSelection();
  const [bag] = useState(() => Bag.new());
  const [loading, setLoading] = useState(false);

  const handlePressClose = () => {
    warehouseDetail.close();
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
          </View>
          <ScrollView style={styles.content}>
            <WarehouseDetailInformationView
              gear={gear}
              canShowSharedImages={gearImageSelection?.canShowSharedImages()}
              onSelectOtherImage={handleSelectOtherImage}
              onEdit={handlePressEdit}
            />
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
    justifyContent: 'flex-start',
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
