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
      <TouchableOpacity style={styles.button} onPress={handlePress}>
        <Ionicons name='image-outline' size={20} color='#667eea' />
        <Text style={styles.buttonText}>공유 이미지 만들기</Text>
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
    paddingBottom: 16,
    backgroundColor: 'white',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f2ff',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
});

export default observer(ShareImageButtonView);
