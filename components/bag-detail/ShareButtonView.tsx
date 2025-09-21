import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// TODO: Install expo-clipboard package
// import * as Clipboard from 'expo-clipboard';
import BagDetail from '@/model/bag-detail/BagDetail';

interface Props {
  bagDetail: BagDetail;
}

const ShareButtonView: FC<Props> = ({ bagDetail }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const shared = bagDetail.isShared();
  const url = bagDetail.getUrl();

  const handleShareButtonPress = () => {
    setShowModal(!showModal);
  };

  const handleShare = async () => {
    setIsLoading(true);

    try {
      if (shared) {
        await bagDetail.unshare();
      } else {
        await bagDetail.share();

        try {
          // TODO: Install expo-clipboard and uncomment
          // await Clipboard.setStringAsync(url);
          Alert.alert('성공', '공유 링크가 클립보드에 복사되었습니다.');
        } catch (error) {
          Alert.alert('오류', '링크 복사에 실패했습니다.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      // TODO: Install expo-clipboard and uncomment
      // await Clipboard.setStringAsync(url);
      Alert.alert('성공', '링크가 클립보드에 복사되었습니다.');
    } catch (error) {
      console.error('복사 실패:', error);
      Alert.alert('오류', '복사에 실패했습니다.');
    }
  };

  return (
    <>
      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShareButtonPress}
      >
        <Ionicons name='share-outline' size={28} color='#333' />
      </TouchableOpacity>
      <Modal
        visible={showModal}
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {shared ? '배낭 공유 중' : '배낭 공유하기'}
            </Text>
            <Text style={styles.modalDescription}>
              {shared
                ? '현재 배낭이 공유되어 다른 사용자가 볼 수 있어요'
                : '배낭을 공유하면 다른 사용자가 볼 수 있어요'}
            </Text>

            {shared && (
              <View style={styles.successBanner}>
                <View style={styles.successIcon}>
                  <Ionicons name='checkmark' size={10} color='white' />
                </View>
                <Text style={styles.successText}>공유가 활성화되었습니다</Text>
              </View>
            )}

            {shared && (
              <View style={styles.urlContainer}>
                <Text style={styles.urlText} numberOfLines={2}>
                  {url}
                </Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyLink}
                >
                  <Ionicons name='copy-outline' size={16} color='#666' />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.mainButton,
                { backgroundColor: isLoading ? '#666' : 'black' },
              ]}
              onPress={handleShare}
              disabled={isLoading}
            >
              <View style={styles.buttonContent}>
                {isLoading && (
                  <View style={styles.spinner}>
                    <Ionicons name='refresh' size={16} color='white' />
                  </View>
                )}
                <Text style={styles.buttonText}>
                  {isLoading ? '' : shared ? '공유 취소' : '공유하기'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  shareButton: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  successBanner: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  successIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#4caf50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#2e7d32',
  },
  urlContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  copyButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spinner: {
    // 간단한 스피너 (실제로는 회전 애니메이션이 필요함)
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default observer(ShareButtonView);
