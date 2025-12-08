import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import ShareImageModalView from './ShareImageModalView';

interface Props {
  bagDetail: BagDetail;
}

const ShareImageButtonView: FC<Props> = ({ bagDetail }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handlePress = () => {
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.touchableContainer}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Ionicons name='sparkles' size={20} color='#7C3AED' />
            <Text style={styles.titleText}>내가 가진 장비로 레디샷 만들기</Text>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
        </View>
        <View style={styles.iconContainer}>
          <Ionicons name='chevron-forward' size={24} color='#191F28' />
        </View>
      </TouchableOpacity>

      <ShareImageModalView
        visible={isModalVisible}
        onClose={handleCloseModal}
        bagDetail={bagDetail}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  touchableContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 6,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '500',
    color: '#191F28',
  },
  aiBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  aiBadgeText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '700',
  },
  iconContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(ShareImageButtonView);
