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
            >
              <Ionicons name='chevron-back' size={24} color='#191F28' />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.content}>
            <WarehouseDetailInformationView
              gear={gear}
              canShowSharedImages={gearImageSelection?.canShowSharedImages()}
              onSelectOtherImage={handleSelectOtherImage}
              onEdit={handlePressEdit}
            />
            <WarehouseDetailPurchaseView warehouseDetail={warehouseDetail} />
            {isAdded && (
              <WarehouseDetailBagRecordView
                gear={gear}
                warehouseDetail={warehouseDetail}
              />
            )}
            <WarehouseDetailReviewSectionView
              warehouseDetail={warehouseDetail}
            />
            <View style={styles.bottomSpacing} />
          </ScrollView>

          {!isAdded && (
            <View style={styles.bottomButtonContainer}>
              <TouchableOpacity
                style={[styles.addButton, loading && styles.disabledButton]}
                onPress={handleAddPress}
                disabled={loading}
              >
                {loading ? (
                  <LoadingView duration={1000} />
                ) : (
                  <View style={styles.buttonContent}>
                    <PretendardText style={styles.addButtonText}>
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
    backgroundColor: 'white',
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    backgroundColor: 'white',
  },
  backButton: {
    // 뒤로가기 버튼 스타일
  },
  content: {
    flexDirection: 'column',
  },
  bottomSpacing: {
    height: 100,
  },
  bottomButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  addButton: {
    backgroundColor: '#000',
    borderRadius: 12,
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
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default observer(WarehouseDetailView);
