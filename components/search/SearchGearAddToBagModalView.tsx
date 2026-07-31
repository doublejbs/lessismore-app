import { FC, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  GestureResponderEvent,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import app from '@/model/app/App';

interface Props {
  visible: boolean;
  onClose: () => void;
  gear: Gear;
  bag: Bag;
}

const SearchGearAddToBagModalView: FC<Props> = ({
  visible,
  onClose,
  gear,
  bag,
}) => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      bag.getList();
    }
  }, [bag, visible]);

  useEffect(() => {
    setShowModal(visible);
  }, [visible]);

  const handleNewBagPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const today = dayjs();
      const newBagId = await bag.add('새 배낭', today, today);

      if (newBagId) {
        await bag.addGearToBag(newBagId, gear);
        app.getAnalyticsManager()?.logClick('search_add', { target: 'bag' });
        setShowModal(false);
        router.push(`/bag/${newBagId}`);
      }
    } catch (error) {
      console.error('새 배낭 생성 및 장비 추가 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBagPress = async (e: GestureResponderEvent, bagItem: BagItem) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const success = await bag.addGearToBag(bagItem.getID(), gear);
      if (success) {
        app.getAnalyticsManager()?.logClick('search_add', { target: 'bag' });
        onClose();
      }
    } catch (error) {
      console.error('배낭에 추가 중 오류:', error);
    } finally {
      setLoading(false);
    }
  };

  const isGearInBag = (bagItem: BagItem) => {
    return gear.getData().bags.includes(bagItem.getID());
  };

  return (
    <Modal
      visible={showModal}
      onRequestClose={onClose}
      animationType='slide'
      presentationStyle='pageSheet'
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'height' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <SheetGrabberView />
            <View style={styles.titleSection}>
              <PretendardText style={styles.title} weight='bold'>
                창고에 추가됐습니다.
              </PretendardText>
              <PretendardText style={styles.title} weight='bold'>
                배낭에도 추가할까요?
              </PretendardText>
            </View>
            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              bounces={true}
            >
              <TouchableOpacity
                style={styles.newBagButton}
                onPress={handleNewBagPress}
                disabled={loading}
                activeOpacity={0.7}
              >
                <View style={styles.bagItemContent}>
                  <View style={styles.bagInfo}>
                    <PretendardText style={styles.bagItemTitle} weight='semibold'>
                      새 배낭에 추가
                    </PretendardText>
                  </View>
                  <Ionicons
                    name='chevron-forward'
                    size={20}
                    color={Color.textPrimary}
                  />
                </View>
              </TouchableOpacity>
              <View style={styles.existingBagsSection}>
                <View style={styles.bagsList}>
                  {bag.getBags().map(bagItem => {
                    const isInBag = isGearInBag(bagItem);
                    return (
                      <TouchableOpacity
                        key={bagItem.getID()}
                        style={[
                          styles.bagItem,
                          isInBag && styles.bagItemDisabled,
                        ]}
                        onPress={e => handleBagPress(e, bagItem)}
                        disabled={isInBag || loading}
                        activeOpacity={0.7}
                      >
                        <View style={styles.bagItemContent}>
                          <View style={styles.bagInfo}>
                            <PretendardText
                              style={[
                                styles.bagItemTitle,
                                isInBag && styles.bagItemTitleDisabled,
                              ]}
                              weight='semibold'
                            >
                              {bagItem.getName()}
                            </PretendardText>
                            <PretendardText
                              style={[
                                styles.bagItemSubtitle,
                                isInBag && styles.bagItemSubtitleDisabled,
                              ]}
                            >
                              {isInBag
                                ? '이미 이 배낭에 있는 제품'
                                : bagItem.getDate()}
                            </PretendardText>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <PretendardText style={styles.closeButtonText} weight='semibold'>
                닫기
              </PretendardText>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    padding: 16,
    paddingBottom: 32,
  },
  closeButton: {
    backgroundColor: Color.chipActiveBg,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Color.background,
  },
  scrollView: {
    flexGrow: 1,
  },
  titleSection: {
    flexDirection: 'column',
    gap: 2,
    paddingVertical: 16,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  newBagButton: {
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  existingBagsSection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 14,
    color: Color.textTertiary,
    marginBottom: 12,
    paddingLeft: 4,
  },
  bagsList: {
    gap: 8,
  },
  bagItem: {
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bagItemDisabled: {
    backgroundColor: Color.thumbBg,
  },
  bagItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bagInfo: {
    flex: 1,
    gap: 2,
  },
  bagItemTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  bagItemTitleDisabled: {
    color: Color.textSecondary,
  },
  bagItemSubtitle: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  bagItemSubtitleDisabled: {
    color: Color.textSecondary,
  },
});

export default observer(SearchGearAddToBagModalView);
