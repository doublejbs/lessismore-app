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
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
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

// 닫기는 주 액션이 아니다 — 이 시트의 주 액션은 배낭 고르기라, 닫기는 조용한 알약으로 둔다.
const CLOSE_PILL_HEIGHT = 54;

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
          behavior='height'
          style={styles.keyboardAvoider}
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
                창고에 담았어요.
              </PretendardText>
              <PretendardText style={styles.title} weight='bold'>
                배낭에도 담을까요?
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
                activeOpacity={LiquidMotion.pressOpacity}
              >
                <View style={styles.bagItemContent}>
                  <View style={styles.bagInfo}>
                    <PretendardText
                      style={styles.bagItemTitle}
                      weight='semibold'
                    >
                      새 배낭에 담기
                    </PretendardText>
                  </View>
                  <Ionicons
                    name='chevron-forward'
                    size={20}
                    color={Liquid.inkSubtle}
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
                        activeOpacity={LiquidMotion.pressOpacity}
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
                                ? '이미 이 배낭에 담긴 장비예요'
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
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='닫기'
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
    // 지면 위 종이 카드로 읽히게 시트 배경을 지면색으로 둔다(기본 흰 배경에서는 카드 경계가 사라진다).
    backgroundColor: Liquid.canvas,
  },
  keyboardAvoider: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: 32,
  },
  closeButton: {
    height: CLOSE_PILL_HEIGHT,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceQuiet,
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Liquid.inkSecondary,
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
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  newBagButton: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
    borderRadius: LiquidRadius.tile,
    paddingHorizontal: LiquidLayout.cardPad,
    paddingVertical: LiquidLayout.cardPad,
    marginBottom: LiquidLayout.listGap,
  },
  existingBagsSection: {
    marginTop: LiquidLayout.listGap,
  },
  bagsList: {
    gap: LiquidLayout.listGap,
  },
  bagItem: {
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
    borderRadius: LiquidRadius.tile,
    paddingHorizontal: LiquidLayout.cardPad,
    paddingVertical: LiquidLayout.cardPad,
  },
  // 이미 담긴 배낭은 지우지 않고 조용한 면으로 낮춘다(핸드오프: 완료 항목은 자리에 남긴다).
  bagItemDisabled: {
    backgroundColor: Liquid.surfaceQuiet,
    boxShadow: 'none',
    borderWidth: 0.5,
    borderColor: Liquid.hairline,
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
    fontSize: LiquidType.body.fontSize,
    lineHeight: LiquidType.body.lineHeight,
    color: Liquid.ink,
  },
  bagItemTitleDisabled: {
    color: Liquid.inkSecondary,
  },
  bagItemSubtitle: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  bagItemSubtitleDisabled: {
    color: Liquid.inkSubtle,
  },
});

export default observer(SearchGearAddToBagModalView);
