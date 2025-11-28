import { FC, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import SearchGearDetail from '@/model/search/SearchGearDetail';
import SearchGearDetailInformationView from './SearchGearDetailInformationView';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import WarehouseDetailReviewSectionView from '../warehouse-detail/WarehouseDetailReviewSectionView';
import PretendardText from '../PretendardText';
import LoadingView from '@/components/ui/LoadingView';

interface Props {
  searchGearDetail: SearchGearDetail;
}

const SearchGearDetailView: FC<Props> = ({ searchGearDetail }) => {
  const gear = searchGearDetail.getGear();
  const [loading, setLoading] = useState(false);

  const handlePressClose = () => {
    searchGearDetail.close();
  };

  const handleAddPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!gear) {
      return;
    }

    setLoading(true);
    try {
      if (gear.isAdded()) {
        await searchGearDetail.removeSingle(gear);
      } else {
        await searchGearDetail.registerSingle(gear);
      }
    } finally {
      setLoading(false);
    }
  };

  if (gear) {
    const isAdded = gear.isAdded();

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
          <SearchGearDetailInformationView gear={gear} />
          <WarehouseDetailReviewSectionView
            warehouseDetail={searchGearDetail.getWarehouseDetail()}
          />
          <View style={styles.bottomSpacing} />
        </ScrollView>
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={[
              styles.addButton,
              isAdded && styles.addedButton,
              loading && styles.disabledButton,
            ]}
            onPress={handleAddPress}
            disabled={loading}
          >
            {loading ? (
              <LoadingView duration={1000} />
            ) : (
              <View style={styles.buttonContent}>
                <PretendardText style={styles.buttonText}>
                  {isAdded ? '내 창고에 추가됨' : '내 창고에 추가하기'}
                </PretendardText>
              </View>
            )}
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
    paddingVertical: 20,
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
  addedButton: {
    backgroundColor: '#4A90E2',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default observer(SearchGearDetailView);
