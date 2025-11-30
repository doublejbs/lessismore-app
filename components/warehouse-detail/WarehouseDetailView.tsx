import { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from './WarehouseDetailReviewSectionView';
import LoadingView from '@/components/ui/LoadingView';
import PretendardText from '../PretendardText';
import SearchGearAddToBagModalView from '../search/SearchGearAddToBagModalView';
import Bag from '@/model/bag/Bag';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();
  const showAddToBagModal = warehouseDetail.shouldShowAddToBagModal();
  const [bag] = useState(() => Bag.new());
  const [loading, setLoading] = useState(false);

  const handlePressClose = () => {
    warehouseDetail.close();
  };

  const handlePressDelete = () => {
    if (gear) {
      warehouseDetail.delete(gear);
    }
  };

  const handlePressEdit = () => {
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
            <WarehouseDetailInformationView gear={gear} />
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

          {isAdded ? (
            <View style={styles.bottomButtons}>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handlePressDelete}
              >
                <Text style={styles.deleteButtonText}>삭제하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editButton}
                onPress={handlePressEdit}
              >
                <Text style={styles.editButtonText}>수정하기</Text>
              </TouchableOpacity>
            </View>
          ) : (
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
  separator: {
    width: '100%',
    height: 10,
    backgroundColor: '#F2F4F6',
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F1F1F1',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '500',
  },
  editButton: {
    flex: 1,
    backgroundColor: 'black',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginLeft: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
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
