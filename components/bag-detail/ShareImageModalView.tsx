import { observer } from 'mobx-react-lite';
import React, { FC, useRef, useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
  Alert,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { PlaywriteNZ_400Regular } from '@expo-google-fonts/playwrite-nz';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';

import ShareImageCanvasView from './share-image/ShareImageCanvasView';
import GearSelectionModalView from './share-image/GearSelectionModalView';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CardSize } from './share-image/constants';

interface Props {
  visible: boolean;
  onClose: () => void;
  bagDetail: BagDetail;
}

interface CategoryGears {
  category: WarehouseFilter;
  gears: Gear[];
}

const ShareImageModalView: FC<Props> = ({ visible, onClose, bagDetail }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const [fontsLoaded] = useFonts({
    PlaywriteNZ_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const displayScale = (windowWidth - 40) / CANVAS_WIDTH;

  const [sortedCategories, setSortedCategories] = useState<CategoryGears[]>([]);
  const [selectedGears, setSelectedGears] = useState<(Gear | null)[]>(
    Array(7).fill(null)
  );
  const [isSelectingGear, setIsSelectingGear] = useState(false);
  const [selectingSlotIndex, setSelectingSlotIndex] = useState<number | null>(
    null
  );
  const [customBackgroundUri, setCustomBackgroundUri] = useState<string | null>(
    null
  );
  const [isLightBackground, setIsLightBackground] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [cardSizes, setCardSizes] = useState<Record<number, CardSize>>({
    1: '1x1',
    2: '1x1',
    3: '1x1',
    4: '1x1',
    5: '1x2',
    6: '1x2',
  });

  const [weightColorIndex, setWeightColorIndex] = useState(0);

  const allGearsWithImages = useMemo(() => {
    const allGears: Gear[] = [];
    sortedCategories.forEach(cat => {
      allGears.push(...cat.gears);
    });
    return allGears.filter(g => g.getImageUrl?.());
  }, [sortedCategories]);

  useEffect(() => {
    if (visible) {
      const data = bagDetail.getGearsByCategory().sort((a, b) => {
        const weightA = a.gears.reduce(
          (sum, gear) => sum + Number(gear.getWeight() || 0),
          0
        );
        const weightB = b.gears.reduce(
          (sum, gear) => sum + Number(gear.getWeight() || 0),
          0
        );
        return weightB - weightA;
      });
      setSortedCategories(data);

      const gearsWithImg: Gear[] = [];
      data.forEach(cat => {
        gearsWithImg.push(...cat.gears.filter(g => g.getImageUrl?.()));
      });

      const gearArray = Array(7).fill(null);

      const tentGear = gearsWithImg.find(
        g => g.getCategory?.() === GearFilter.Tent
      );
      if (tentGear) {
        gearArray[0] = tentGear;
      }

      const backpackGear = gearsWithImg.find(
        g => g.getCategory?.() === GearFilter.Backpack && g !== tentGear
      );
      if (backpackGear) {
        gearArray[5] = backpackGear;
      }

      const sleepingBagGear = gearsWithImg.find(
        g =>
          g.getCategory?.() === GearFilter.SleepingBag &&
          g !== tentGear &&
          g !== backpackGear
      );
      if (sleepingBagGear) {
        gearArray[6] = sleepingBagGear;
      }

      const usedGears = new Set(
        [tentGear, backpackGear, sleepingBagGear].filter(Boolean)
      );
      const remainingGears = gearsWithImg
        .filter(g => !usedGears.has(g))
        .sort((a, b) => {
          const weightA = Number(a.getWeight() || 0);
          const weightB = Number(b.getWeight() || 0);
          return weightB - weightA;
        });

      const remainingPositions = [1, 2, 3, 4];
      remainingGears.slice(0, 4).forEach((gear, idx) => {
        gearArray[remainingPositions[idx]] = gear;
      });

      setSelectedGears(gearArray);
      setIsEditMode(false);
      setCardSizes({
        1: '1x1',
        2: '1x1',
        3: '1x1',
        4: '1x1',
        5: '1x2',
        6: '1x2',
      });
      setCustomBackgroundUri(null);
      setIsLightBackground(false);
      setWeightColorIndex(0);
      setIsReady(false);
      setTimeout(() => setIsReady(true), 2000);
    } else {
      setIsReady(false);
    }
  }, [visible, bagDetail]);

  const totalWeight = String(bagDetail.getWeight());
  const totalWeightNum = sortedCategories.reduce(
    (sum, cat) =>
      sum + cat.gears.reduce((s, g) => s + Number(g.getWeight() || 0), 0),
    0
  );

  const handleShareImage = async () => {
    if (!viewShotRef.current) {
      Alert.alert('오류', '이미지를 생성할 수 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      setIsCapturing(true);
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await viewShotRef.current.capture?.();

      setIsCapturing(false);

      if (uri) {
        await Share.share({
          url: uri,
          message: `${bagDetail.getName()} - ${totalWeight}`,
        });
      }
    } catch (error) {
      console.error(error);
      Alert.alert('공유 실패', '오류가 발생했습니다.');
      setIsCapturing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectGear = (gear: Gear) => {
    if (selectingSlotIndex !== null) {
      const newSelectedGears = [...selectedGears];
      newSelectedGears[selectingSlotIndex] = gear;
      setSelectedGears(newSelectedGears);
      setIsSelectingGear(false);
      setSelectingSlotIndex(null);
    }
  };

  const handleSlotClick = (index: number) => {
    setSelectingSlotIndex(index);
    setIsSelectingGear(true);
  };

  const handleRemoveGear = (index: number) => {
    const newSelectedGears = [...selectedGears];
    newSelectedGears[index] = null;
    setSelectedGears(newSelectedGears);
  };

  const handleCardSizeChange = (index: number) => {
    const currentSize = cardSizes[index];
    let nextSize: CardSize;
    const newSizes = { ...cardSizes };

    if (index >= 1 && index <= 4) {
      if (currentSize === '1x1') {
        nextSize = '2x1';
        if (index === 1 || index === 2) {
          [1, 2].forEach(i => {
            if (i !== index) {
              newSizes[i] = '1x1';
            }
          });
        } else {
          [3, 4].forEach(i => {
            if (i !== index) {
              newSizes[i] = '1x1';
            }
          });
        }
      } else if (currentSize === '2x1') {
        nextSize = '2x2';
        [1, 2, 3, 4].forEach(i => {
          if (i !== index) {
            newSizes[i] = '1x1';
          }
        });
      } else {
        nextSize = '1x1';
      }
    } else if (index >= 5 && index <= 6) {
      if (currentSize === '1x2') {
        nextSize = '2x2';
        [5, 6].forEach(i => {
          if (i !== index) {
            newSizes[i] = '1x2';
          }
        });
      } else {
        nextSize = '1x2';
      }
    } else {
      return;
    }

    newSizes[index] = nextSize;
    setCardSizes(newSizes);
  };

  const handleWeightColorChange = () => {
    setWeightColorIndex(prev => (prev + 1) % 8);
  };

  const handleBackgroundChangeWrapper = (uri: string, isLight: boolean) => {
    setCustomBackgroundUri(uri);
    setIsLightBackground(isLight);
  };

  if (!fontsLoaded) {
    return (
      <Modal
        visible={visible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.container,
            { justifyContent: 'center', alignItems: 'center' },
          ]}
        >
          <ActivityIndicator size='large' color='#39FF14' />
          <Text style={{ marginTop: 16, color: '#666' }}>폰트 로딩 중...</Text>
        </View>
      </Modal>
    );
  }

  if (!isReady) {
    return (
      <Modal
        visible={visible}
        animationType='slide'
        presentationStyle='pageSheet'
        onRequestClose={onClose}
      >
        <View
          style={[
            styles.container,
            {
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#000000',
            },
          ]}
        >
          <View style={styles.aiLoadingContainer}>
            <View style={styles.sparkleIcon}>
              <Ionicons name='sparkles' size={48} color='#7C3AED' />
            </View>
            <Text style={styles.aiLoadingTitle}>AI로 이미지 생성 중...</Text>
            <Text style={styles.aiLoadingSubtitle}>
              배낭 정보를 분석하고 있습니다
            </Text>
            <ActivityIndicator
              size='large'
              color='#7C3AED'
              style={{ marginTop: 24 }}
            />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name='close' size={24} color='#191F28' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>공유 이미지</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.previewContainer}>
            <View
              style={{
                width: CANVAS_WIDTH * displayScale,
                height: CANVAS_HEIGHT * displayScale,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <View
                style={{
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  transform: [{ scale: displayScale }],
                }}
              >
                <ViewShot
                  ref={viewShotRef}
                  options={{ format: 'jpg', quality: 0.9 }}
                >
                  <ShareImageCanvasView
                    selectedGears={selectedGears}
                    cardSizes={cardSizes}
                    categories={sortedCategories}
                    totalWeight={totalWeight}
                    totalWeightNum={totalWeightNum}
                    bagName={bagDetail.getName()}
                    weightColorIndex={weightColorIndex}
                    customBackgroundUri={customBackgroundUri}
                    isLightBackground={isLightBackground}
                    isEditMode={isEditMode}
                    isCapturing={isCapturing}
                    onSlotClick={handleSlotClick}
                    onRemoveGear={handleRemoveGear}
                    onCardSizeChange={handleCardSizeChange}
                    onWeightColorChange={handleWeightColorChange}
                    onBackgroundChange={handleBackgroundChangeWrapper}
                  />
                </ViewShot>
              </View>
            </View>
          </View>

          {isEditMode && (
            <View style={styles.guideContainer}>
              <View style={styles.infoTextContainer}>
                <Ionicons name='image-outline' size={16} color='#666666' />
                <Text style={styles.infoText}>
                  장비 이미지를 누르면 표시할 장비를 선택할 수 있습니다.
                </Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Ionicons name='expand-outline' size={16} color='#666666' />
                <Text style={styles.infoText}>
                  크기 조정 버튼을 클릭하면 크기 조정이 가능합니다.
                </Text>
              </View>
              <View style={styles.infoTextContainer}>
                <Ionicons name='refresh-outline' size={16} color='#666666' />
                <Text style={styles.infoText}>
                  무게 카드를 누르면 색상 변경이 가능합니다.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {isEditMode ? (
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsEditMode(false)}
              activeOpacity={1}
            >
              <Text style={styles.doneButtonText}>완료</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => setIsEditMode(true)}
                activeOpacity={1}
              >
                <Text style={styles.editButtonText}>수정하기</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.shareButton,
                  (!isReady || isSaving) && styles.shareButtonDisabled,
                ]}
                onPress={handleShareImage}
                disabled={!isReady || isSaving}
                activeOpacity={1}
              >
                <Ionicons
                  name='share-outline'
                  size={20}
                  color={!isReady || isSaving ? '#999999' : 'white'}
                />
                <Text
                  style={[
                    styles.shareButtonText,
                    (!isReady || isSaving) && styles.shareButtonTextDisabled,
                  ]}
                >
                  공유하기
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <GearSelectionModalView
          visible={isSelectingGear}
          gears={allGearsWithImages}
          onClose={() => setIsSelectingGear(false)}
          onSelectGear={handleSelectGear}
        />
      </GestureHandlerRootView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  closeButton: {
    padding: 4,
  },
  headerRight: {
    width: 32,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#191F28',
    fontFamily: 'Inter_600SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    paddingVertical: 20,
  },
  guideContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
    alignItems: 'flex-start',
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  doneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#191F28',
    fontFamily: 'Inter_600SemiBold',
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  shareButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    fontFamily: 'Inter_600SemiBold',
  },
  shareButtonTextDisabled: {
    color: '#999999',
  },
  aiLoadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  sparkleIcon: {
    marginBottom: 24,
  },
  aiLoadingTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
    fontFamily: 'Inter_600SemiBold',
  },
  aiLoadingSubtitle: {
    fontSize: 14,
    color: '#999999',
    fontFamily: 'Inter_400Regular',
  },
});

export default observer(ShareImageModalView);
