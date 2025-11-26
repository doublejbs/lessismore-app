import React, { FC, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import Bag from '@/model/bag/Bag';
import BagItem from '@/model/bag/BagItem';

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

  useEffect(() => {
    if (visible) {
      bag.getList();
    }
  }, [bag, visible]);

  const handleNewBagPress = () => {
    onClose();
    router.push('/bag');
  };

  const handleBagPress = async (bagItem: BagItem) => {
    setLoading(true);
    try {
      const success = await bag.addGearToBag(bagItem.getID(), gear);
      if (success) {
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
      visible={visible}
      transparent={true}
      onRequestClose={onClose}
      animationType='fade'
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        onPress={onClose}
        activeOpacity={1}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'height' : 'height'}
          style={{ flex: 1, justifyContent: 'flex-end' }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.titleSection}>
              <PretendardText style={styles.title}>
                창고에 추가됐습니다.
              </PretendardText>
              <PretendardText style={styles.title}>
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
                activeOpacity={0.7}
              >
                <View style={styles.bagItemContent}>
                  <View>
                    <PretendardText style={styles.bagItemTitle}>
                      새 배낭에 추가
                    </PretendardText>
                  </View>
                  <Ionicons name='chevron-forward' size={20} color='#000' />
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
                        onPress={() => handleBagPress(bagItem)}
                        disabled={isInBag || loading}
                        activeOpacity={0.7}
                      >
                        <View style={styles.bagItemContent}>
                          <View>
                            <PretendardText
                              style={[
                                styles.bagItemTitle,
                                isInBag && styles.bagItemTitleDisabled,
                              ]}
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
                          {!isInBag && (
                            <Ionicons
                              name='chevron-forward'
                              size={20}
                              color='#000'
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const { height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
    paddingTop: 24,
    maxHeight: screenHeight * 0.85,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flexGrow: 1,
  },
  titleSection: {
    flexDirection: 'column',
    gap: 2,
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  title: {
    fontFamily: 'Pretendard-Bold',
    fontSize: 20,
    lineHeight: 28,
  },
  newBagButton: {
    backgroundColor: 'white',
    borderRadius: 16.4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  existingBagsSection: {
    marginTop: 8,
  },
  sectionLabel: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 14,
    color: '#45556c',
    marginBottom: 12,
    paddingLeft: 4,
  },
  bagsList: {
    gap: 8,
  },
  bagItem: {
    backgroundColor: 'white',
    borderRadius: 16.4,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bagItemDisabled: {
    backgroundColor: '#F5F5F5',
  },
  bagItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bagItemTitle: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  bagItemTitleDisabled: {
    color: '#62748e',
  },
  bagItemSubtitle: {
    fontFamily: 'Pretendard-Regular',
    fontSize: 12,
    color: '#45556c',
  },
  bagItemSubtitleDisabled: {
    color: '#90a1b9',
  },
});

export default observer(SearchGearAddToBagModalView);
