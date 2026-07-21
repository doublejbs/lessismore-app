import { observer } from 'mobx-react-lite';
import { FC, useRef, useState, useEffect, useMemo } from 'react';
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
import { ViewShotRef } from 'react-native-view-shot';
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

import GridLayoutView from './share-image/GridLayoutView';
import CollageLayoutView from './share-image/CollageLayoutView';
import GearSelectionModalView from './share-image/GearSelectionModalView';
import { CANVAS_WIDTH, CardSize } from './share-image/constants';

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
  const viewShotRef = useRef<ViewShotRef>(null);
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

  type LayoutType = 'grid' | 'collage';
  const [layoutType, setLayoutType] = useState<LayoutType>('grid');
  const [collageKey, setCollageKey] = useState(0);
  const [showGearNames, setShowGearNames] = useState(false);

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
      setLayoutType('grid');
      setShowGearNames(false);
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

  const handleCollageBackgroundChange = (uri: string | null) => {
    setCustomBackgroundUri(uri);
  };

  const handleCollageRefresh = () => {
    setCollageKey(prev => prev + 1);
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

        {/* 레이아웃 탭 - 세그먼트 컨트롤 스타일 */}
        <View style={styles.segmentContainer}>
          <View style={styles.segmentBackground}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                layoutType === 'grid' && styles.segmentButtonActive,
              ]}
              onPress={() => {
                setLayoutType('grid');
                setIsEditMode(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name='grid-outline'
                size={18}
                color={layoutType === 'grid' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  layoutType === 'grid' && styles.segmentButtonTextActive,
                ]}
              >
                그리드
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                layoutType === 'collage' && styles.segmentButtonActive,
              ]}
              onPress={() => {
                setLayoutType('collage');
                setIsEditMode(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name='shuffle-outline'
                size={18}
                color={layoutType === 'collage' ? '#FFFFFF' : '#000000'}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  layoutType === 'collage' && styles.segmentButtonTextActive,
                ]}
              >
                콜라주
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {layoutType === 'grid' ? (
            <GridLayoutView
              viewShotRef={viewShotRef}
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
              displayScale={displayScale}
              onSlotClick={handleSlotClick}
              onRemoveGear={handleRemoveGear}
              onCardSizeChange={handleCardSizeChange}
              onWeightColorChange={handleWeightColorChange}
              onBackgroundChange={handleBackgroundChangeWrapper}
            />
          ) : (
            <CollageLayoutView
              viewShotRef={viewShotRef}
              selectedGears={selectedGears}
              categories={sortedCategories}
              totalWeight={totalWeight}
              bagName={bagDetail.getName()}
              isEditMode={isEditMode}
              isCapturing={isCapturing}
              displayScale={displayScale}
              collageKey={collageKey}
              customBackgroundUri={customBackgroundUri}
              showGearNames={showGearNames}
              onCollageRefresh={handleCollageRefresh}
              onBackgroundChange={handleCollageBackgroundChange}
              onToggleGearNames={() => setShowGearNames(prev => !prev)}
            />
          )}
        </ScrollView>

        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          {isEditMode ? (
            <View style={styles.buttonRow}>
              {layoutType === 'collage' && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleCollageRefresh}
                  activeOpacity={1}
                >
                  <Ionicons name='refresh-outline' size={20} color='#666666' />
                  <Text style={styles.resetButtonText}>장비 재배치</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.doneButton,
                  layoutType === 'collage' && styles.doneButtonFlex,
                ]}
                onPress={() => setIsEditMode(false)}
                activeOpacity={1}
              >
                <Text style={styles.doneButtonText}>완료</Text>
              </TouchableOpacity>
            </View>
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
                  styles.shareButtonFlex,
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
    backgroundColor: '#FFFFFF',
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
  },
  doneButtonFlex: {
    flex: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    gap: 6,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
    fontFamily: 'Inter_600SemiBold',
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
  segmentContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  segmentBackground: {
    flexDirection: 'row',
    backgroundColor: '#E8E8E8',
    borderRadius: 10,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
    borderRadius: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#000000',
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Inter_600SemiBold',
  },
  segmentButtonTextActive: {
    color: '#FFFFFF',
  },
  shareButtonFlex: {
    flex: 1,
  },
});

export default observer(ShareImageModalView);
