import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from './WarehouseDetailReviewSectionView';

interface Props {
  warehouseDetail: WarehouseDetail;
}

const WarehouseDetailView: FC<Props> = ({ warehouseDetail }) => {
  const gear = warehouseDetail.getGear();

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

  if (gear) {
    return (
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
          <WarehouseDetailBagRecordView
            gear={gear}
            warehouseDetail={warehouseDetail}
          />
          <WarehouseDetailReviewSectionView warehouseDetail={warehouseDetail} />
          <View style={styles.bottomSpacing} />
        </ScrollView>

        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handlePressDelete}
          >
            <Text style={styles.deleteButtonText}>삭제하기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editButton} onPress={handlePressEdit}>
            <Text style={styles.editButtonText}>수정하기</Text>
          </TouchableOpacity>
        </View>
      </View>
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
});

export default observer(WarehouseDetailView);
