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
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';
import SheetGrabberView from '@/components/ui/SheetGrabberView';
import app from '@/model/app/App';
import useSheetTransition from '@/hooks/useSheetTransition';

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
  const { isReduceMotionEnabled } = useSheetTransition();
  const l10n = app.getL10n();

  useEffect(() => {
    if (visible) {
      bag.getList();
    }
  }, [bag, visible]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setShowModal(visible);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [visible]);

  const handleNewBagPress = async (e: GestureResponderEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    try {
      const today = dayjs();
      const newBagId = await bag.add(
        l10n.t('search.addToBag.newBagName'),
        today,
        today
      );

      if (newBagId) {
        await bag.addGearToBag(newBagId, gear);
        app.getAnalyticsManager()?.logClick('search_add', { target: 'bag' });
        setShowModal(false);
        router.push(`/bag/${newBagId}`);
      }
    } catch (error) {
      console.error('새 배낭 생성 및 장비 추가 중 오류:', error); // l10n-ignore
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
      console.error('배낭에 추가 중 오류:', error); // l10n-ignore
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
      animationType={isReduceMotionEnabled ? 'fade' : 'slide'}
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
                {l10n.t('search.addToBag.titleAdded')}
              </PretendardText>
              <PretendardText style={styles.title} weight='bold'>
                {l10n.t('search.addToBag.titleQuestion')}
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
                    <PretendardText
                      style={styles.bagItemTitle}
                      weight='semibold'
                    >
                      {l10n.t('search.addToBag.newBag')}
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
                                ? l10n.t('search.addToBag.alreadyInBag')
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
                {l10n.t('search.addToBag.close')}
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
    borderRadius: 26,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    ...AcgType.control,
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
    ...AcgType.screenTitle,
    color: Color.textPrimary,
  },
  newBagButton: {
    backgroundColor: Color.surfaceMuted,
    borderRadius: 26,
    paddingHorizontal: 16,
    minHeight: 52,
    justifyContent: 'center',
    marginBottom: 8,
  },
  existingBagsSection: {
    marginTop: 8,
  },
  sectionLabel: {
    ...AcgType.rowSubtitle,
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
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  bagItemTitleDisabled: {
    color: Color.textSecondary,
  },
  bagItemSubtitle: {
    ...AcgType.meta,
    color: Color.textTertiary,
  },
  bagItemSubtitleDisabled: {
    color: Color.textSecondary,
  },
});

export default observer(SearchGearAddToBagModalView);
