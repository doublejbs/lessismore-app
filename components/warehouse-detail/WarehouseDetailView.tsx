import { FC } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import WarehouseDetail from '../../model/warehouse-detail/WarehouseDetail';
import WarehouseDetailInformationView from './WarehouseDetailInformationView';
import WarehouseDetailBagRecordView from './WarehouseDetailBagRecordView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';

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
      <SafeAreaView style={styles.container}>
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
          </ScrollView>

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
        </View>
      </SafeAreaView>
    );
  }

  return null;
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
    paddingVertical: 7,
    paddingHorizontal: 20,
    position: 'absolute',
    top: 0,
    zIndex: 1,
    backgroundColor: 'white',
  },
  backButton: {
    // 뒤로가기 버튼 스타일
  },
  content: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    marginTop: 46,
    paddingBottom: 100,
  },
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'white',
  },
  deleteButton: {
    flex: 1,
    backgroundColor: '#F1F1F1',
    borderRadius: 10,
    paddingVertical: 18,
    alignItems: 'center',
    marginRight: 8,
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
});

export default observer(WarehouseDetailView);
