import { observer } from 'mobx-react-lite';
import { FC, useState } from 'react';
import { View, TouchableOpacity, Modal, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  bagDetail: BagDetail;
}

const ShareButtonView: FC<Props> = ({ bagDetail }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const insets = useSafeAreaInsets();
  const shared = bagDetail.isShared();
  const url = bagDetail.getUrl();

  const handleShareButtonPress = () => {
    app.getAnalyticsManager()?.logClick('bag_share');
    setShowModal(!showModal);
  };

  const handleShare = async () => {
    setIsLoading(true);

    try {
      if (shared) {
        await bagDetail.unshare();
        Alert.alert('알림', '공유가 취소되었습니다.');
      } else {
        await bagDetail.share();

        try {
          await Clipboard.setStringAsync(url);
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
      await Clipboard.setStringAsync(url);
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
        hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
        accessibilityRole='button'
        accessibilityLabel='공유'
      >
        <Ionicons name='share-outline' size={24} color={Color.textPrimary} />
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
          <View
            style={[styles.modalContent, { paddingBottom: 12 + insets.bottom }]}
          >
            <PretendardText style={styles.modalTitle} weight='bold'>
              {shared ? '배낭 공유 중' : '배낭 공유하기'}
            </PretendardText>
            <PretendardText style={styles.modalDescription}>
              {shared
                ? '현재 배낭이 공유되어 다른 사용자가 볼 수 있어요'
                : '배낭을 공유하면 다른 사용자가 볼 수 있어요'}
            </PretendardText>

            {shared && (
              <View style={styles.successBanner}>
                <View style={styles.successIcon}>
                  <Ionicons name='checkmark' size={10} color='#FFFFFF' />
                </View>
                <PretendardText style={styles.successText}>
                  공유가 활성화되었습니다
                </PretendardText>
              </View>
            )}

            {shared && (
              <View style={styles.urlContainer}>
                <PretendardText style={styles.urlText} numberOfLines={2}>
                  {url}
                </PretendardText>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={handleCopyLink}
                >
                  <Ionicons
                    name='copy-outline'
                    size={16}
                    color={Color.textTertiary}
                  />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.mainButton,
                {
                  backgroundColor: isLoading
                    ? Color.textTertiary
                    : Color.chipActiveBg,
                },
              ]}
              onPress={handleShare}
              disabled={isLoading}
            >
              <View style={styles.buttonContent}>
                {isLoading && (
                  <View style={styles.spinner}>
                    <Ionicons name='refresh' size={16} color='#FFFFFF' />
                  </View>
                )}
                <PretendardText style={styles.buttonText} weight='medium'>
                  {isLoading ? '' : shared ? '공유 취소' : '공유하기'}
                </PretendardText>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.modal,
    borderTopRightRadius: Radius.modal,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: Color.textTertiary,
    textAlign: 'center',
    marginBottom: 20,
  },
  successBanner: {
    backgroundColor: '#e8f5e8',
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: Radius.card,
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
    backgroundColor: Color.surfaceMuted,
    padding: 12,
    borderRadius: Radius.card,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: Color.textTertiary,
  },
  copyButton: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    width: '100%',
    padding: 12,
    borderRadius: Radius.input,
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
    color: '#FFFFFF',
    fontSize: 16,
  },
});

export default observer(ShareButtonView);
