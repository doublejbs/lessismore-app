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
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Path, Circle } from 'react-native-svg';
import {
  useFonts,
  PlaywriteNZ_400Regular,
} from '@expo-google-fonts/playwrite-nz';

import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';

const LOGO_IMG = require('@/assets/images/logo.png');
const MOUNTAIN_IMG = require('@/assets/images/mountain.png');

interface Props {
  visible: boolean;
  onClose: () => void;
  bagDetail: BagDetail;
}

interface CategoryGears {
  category: WarehouseFilter;
  gears: Gear[];
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  [GearFilter.Backpack]: '배낭',
  [GearFilter.Tent]: '텐트',
  [GearFilter.SleepingBag]: '침낭',
  [GearFilter.Mat]: '매트',
  [GearFilter.Lantern]: '랜턴',
  [GearFilter.Cooking]: '조리',
  [GearFilter.Clothing]: '의류',
  [GearFilter.Furniture]: '가구',
  [GearFilter.Electronic]: '전자기기',
  [GearFilter.Food]: '음식',
  [GearFilter.Etc]: '기타',
};

// Canvas Dimensions (4:5 ratio for Instagram)
const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1350; // 4:5 ratio
const BG_COLOR = '#000000'; // Black Background
const CARD_BG_COLOR = '#1A1A1A'; // Dark Grey Cards
const TOTAL_BG_GRADIENT: readonly [string, string] = ['#6B8E23', '#556B2F']; // Olive Green Gradient - Forest & Natural

// Layout Constants (optimized for 4:5 Instagram ratio: 1080 x 1350)
const PADDING = 24;
const GAP = 20;

// Grid-based Layout System (4 columns)
const CELL_SIZE = 243; // Base cell size
const CELL_1x1 = CELL_SIZE;
const CELL_2x2 = CELL_SIZE * 2 + GAP; // 243 * 2 + 20 = 506
// Total width: 24 + 243*4 + 20*3 + 24 = 1080 ✓
// Total height: 24 + 506 + 20 + 506 + 20 + 243 + 31 = 1350 ✓

// Chart Colors (Modern Vibrant Palette - Sophisticated & Bold)
const CHART_COLORS = [
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F43F5E', // Rose
  '#06B6D4', // Cyan
  '#8B5CF6', // Purple (repeat for more categories)
  '#A78BFA', // Light Purple
  '#FB923C', // Orange
];

const DARK_TEXT_MAIN = '#FFFFFF'; // White
const DARK_TEXT_SUB = '#999999'; // Grey

const ShareImageModalView: FC<Props> = ({ visible, onClose, bagDetail }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Load Playwrite NZ Font
  const [fontsLoaded] = useFonts({
    PlaywriteNZ_400Regular,
  });

  // Display Scale
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

  // 이미지가 있는 모든 장비 리스트
  const allGearsWithImages = useMemo(() => {
    const allGears: Gear[] = [];
    sortedCategories.forEach(cat => {
      allGears.push(...cat.gears);
    });
    return allGears.filter(g => g.getImageUrl?.());
  }, [sortedCategories]);

  useEffect(() => {
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

    // 초기 선택: 이미지 있는 장비 중 처음 7개 자동 선택
    const gearsWithImg: Gear[] = [];
    data.forEach(cat => {
      gearsWithImg.push(...cat.gears.filter(g => g.getImageUrl?.()));
    });
    const initialGears = gearsWithImg.slice(0, 7);
    const gearArray = Array(7).fill(null);
    initialGears.forEach((gear, idx) => {
      gearArray[idx] = gear;
    });
    setSelectedGears(gearArray);
  }, [bagDetail]);

  useEffect(() => {
    if (visible) {
      setTimeout(() => setIsReady(true), 500);
    } else {
      setIsReady(false);
    }
  }, [visible]);

  const activeCategories = useMemo(() => {
    return sortedCategories;
  }, [sortedCategories]);

  const totalWeight = bagDetail.getWeight();
  const totalWeightNum = sortedCategories.reduce(
    (sum, cat) =>
      sum + cat.gears.reduce((s, g) => s + Number(g.getWeight() || 0), 0),
    0
  );

  // Handle Image Save
  const handleSaveImage = async () => {
    if (!viewShotRef.current) {
      Alert.alert('오류', '이미지를 생성할 수 없습니다.');
      return;
    }

    setIsSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
        setIsSaving(false);
        return;
      }
      const uri = await viewShotRef.current.capture?.();
      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('저장 완료', '이미지가 저장되었습니다.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('저장 실패', '오류가 발생했습니다.');
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

  const handleChangeBackground = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [2, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      setCustomBackgroundUri(result.assets[0].uri);

      // 배경이 밝은지 물어보기
      Alert.alert('배경 밝기 선택', '배경 이미지가 밝은 이미지인가요?', [
        {
          text: '어두운 배경',
          onPress: () => setIsLightBackground(false),
        },
        {
          text: '밝은 배경',
          onPress: () => setIsLightBackground(true),
        },
      ]);
    }
  };

  // 선택된 장비 배열
  const gearsWithImages = selectedGears;

  // 개별 장비 카드 렌더러 (클릭 가능)
  const renderGearCard = (
    gear: Gear | null,
    width: number,
    height: number,
    slotIndex: number
  ) => {
    return (
      <TouchableOpacity
        style={[
          styles.cardBase,
          {
            width,
            height,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: gear ? CARD_BG_COLOR : '#2A2A2A',
            borderWidth: gear ? 0 : 2,
            borderColor: '#444444',
            borderStyle: gear ? 'solid' : 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
        onPress={() => handleSlotClick(slotIndex)}
        onLongPress={() => gear && handleRemoveGear(slotIndex)}
      >
        {gear ? (
          <Image
            source={{ uri: gear.getImageUrl?.() }}
            style={{ width: '100%', height: '100%' }}
            contentFit='cover'
          />
        ) : (
          <Ionicons name='add-circle-outline' size={48} color='#666666' />
        )}
      </TouchableOpacity>
    );
  };

  // Chart Card Renderer
  const renderChartCard = (width: number, height: number) => {
    const chartSize = Math.min(width, height) * 0.6;
    const radius = chartSize / 2;
    const innerRadius = radius * 0.6;
    let startAngle = -90;

    const slices = activeCategories.map((cat, idx) => {
      const weight = cat.gears.reduce(
        (s, g) => s + Number(g.getWeight() || 0),
        0
      );
      const percentage = totalWeightNum > 0 ? weight / totalWeightNum : 0;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;

      const x1 = radius + radius * Math.cos((Math.PI * startAngle) / 180);
      const y1 = radius + radius * Math.sin((Math.PI * startAngle) / 180);
      const x2 = radius + radius * Math.cos((Math.PI * endAngle) / 180);
      const y2 = radius + radius * Math.sin((Math.PI * endAngle) / 180);

      const largeArc = angle > 180 ? 1 : 0;
      const pathData = `M ${radius} ${radius} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const color = CHART_COLORS[idx % CHART_COLORS.length];
      startAngle = endAngle;

      return { path: pathData, color, percentage, category: cat };
    });

    return (
      <View
        style={[
          styles.cardBase,
          {
            width,
            height,
            flexDirection: 'row',
            padding: 24,
            alignItems: 'center',
            backgroundColor: '#1A1A1A', // Slightly lighter dark background
            borderWidth: 2,
            borderColor: 'rgba(139, 92, 246, 0.3)', // Purple accent border
          },
        ]}
      >
        {/* Chart */}
        <View style={{ width: chartSize, height: chartSize }}>
          <Svg width={chartSize} height={chartSize}>
            {slices.map((slice, i) => (
              <Path key={i} d={slice.path} fill={slice.color} />
            ))}
            <Circle
              cx={radius}
              cy={radius}
              r={innerRadius}
              fill='#1A1A1A' // Dark Inner Circle matching card background
            />
          </Svg>
          <View
            style={[
              StyleSheet.absoluteFill,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: DARK_TEXT_MAIN,
                fontFamily: 'Pretendard-Bold',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              {bagDetail.getName()}
            </Text>
          </View>
        </View>

        {/* Legend */}
        <View style={{ flex: 1, paddingLeft: 24, gap: 8 }}>
          {slices.slice(0, 5).map((slice, idx) => (
            <View
              key={idx}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: slice.color,
                  }}
                />
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '600',
                    color: DARK_TEXT_MAIN, // White Text
                  }}
                >
                  {CATEGORY_NAME_MAP[slice.category.category.getFilter()] ||
                    slice.category.category.getName()}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: DARK_TEXT_MAIN, // White Text
                  }}
                >
                  {(slice.percentage * 100).toFixed(1)}%
                </Text>
                <Text style={{ fontSize: 14, color: DARK_TEXT_SUB }}>
                  {slice.category.gears.reduce(
                    (s, g) => s + Number(g.getWeight() || 0),
                    0
                  ) >= 1000
                    ? (
                        slice.category.gears.reduce(
                          (s, g) => s + Number(g.getWeight() || 0),
                          0
                        ) / 1000
                      ).toFixed(2) + 'kg'
                    : slice.category.gears.reduce(
                        (s, g) => s + Number(g.getWeight() || 0),
                        0
                      ) + 'g'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTotalWeightCard = (width: number, height: number) => (
    <LinearGradient
      colors={TOTAL_BG_GRADIENT}
      style={[
        styles.cardBase,
        {
          width,
          height,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <Text
        style={[
          styles.totalWeightText,
          {
            color: '#FFFFFF',
            fontSize: width > 300 ? 90 : 70,
            fontFamily: 'PlaywriteNZ_400Regular',
            fontWeight: '700',
            textShadowColor: 'rgba(0, 0, 0, 0.3)',
            textShadowOffset: { width: 2, height: 2 },
            textShadowRadius: 8,
          },
        ]}
      >
        {totalWeight}kg
      </Text>
    </LinearGradient>
  );

  // 로고 카드
  const renderNatureImageCard = (width: number, height: number) => {
    const logoSize = width * 0.7;
    const textColor = isLightBackground ? '#000000' : '#FFFFFF';
    const backgroundSource = customBackgroundUri
      ? { uri: customBackgroundUri }
      : MOUNTAIN_IMG;

    return (
      <TouchableOpacity
        style={[
          styles.cardBase,
          {
            width,
            height,
            justifyContent: 'center',
            alignItems: 'center',
            gap: 4,
            overflow: 'hidden',
          },
        ]}
        onPress={handleChangeBackground}
        activeOpacity={0.8}
      >
        {/* 배경 이미지 */}
        <Image
          source={backgroundSource}
          style={StyleSheet.absoluteFill}
          contentFit='cover'
        />
        {/* 오버레이 */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: isLightBackground
                ? 'rgba(255, 255, 255, 0.2)'
                : 'rgba(0, 0, 0, 0.3)',
            },
          ]}
        />
        {/* 로고 */}
        <Image
          source={LOGO_IMG}
          style={{ width: logoSize, height: logoSize, zIndex: 1 }}
          contentFit='contain'
          tintColor={textColor}
        />
        <Text
          style={{
            color: textColor,
            fontSize: 24,
            fontWeight: '400',
            position: 'absolute',
            bottom: 20,
            zIndex: 1,
          }}
        >
          https://useless.my
        </Text>
      </TouchableOpacity>
    );
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
          <View style={{ width: 40 }} />
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
                  <View style={styles.canvas}>
                    {/* Grid-based Absolute Layout - 4 Columns */}
                    <View style={StyleSheet.absoluteFill}>
                      {/* Row 1-2: Gear1 (2x2) | Gear2 (1x1) | Gear3 (1x1) */}
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING,
                          top: PADDING,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[0],
                          CELL_2x2,
                          CELL_2x2,
                          0
                        )}
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP,
                          top: PADDING,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[1],
                          CELL_1x1,
                          CELL_1x1,
                          1
                        )}
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
                          top: PADDING,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[2],
                          CELL_1x1,
                          CELL_1x1,
                          2
                        )}
                      </View>

                      {/* Row 2: Gear4 (1x1) | Gear5 (1x1) */}
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP,
                          top: PADDING + CELL_1x1 + GAP,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[3],
                          CELL_1x1,
                          CELL_1x1,
                          3
                        )}
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
                          top: PADDING + CELL_1x1 + GAP,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[4],
                          CELL_1x1,
                          CELL_1x1,
                          4
                        )}
                      </View>

                      {/* Row 3-4: TotalWeight (2x1) | Chart (2x2) */}
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING,
                          top: PADDING + CELL_2x2 + GAP,
                        }}
                      >
                        {renderTotalWeightCard(CELL_2x2, CELL_1x1)}
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP,
                          top: PADDING + CELL_2x2 + GAP,
                        }}
                      >
                        {renderChartCard(CELL_2x2, CELL_2x2)}
                      </View>

                      {/* Row 4-5: Gear6 (1x2) | Gear7 (1x2) */}
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING,
                          top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[5],
                          CELL_1x1,
                          CELL_2x2,
                          5
                        )}
                      </View>
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_1x1 + GAP,
                          top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
                        }}
                      >
                        {renderGearCard(
                          gearsWithImages[6],
                          CELL_1x1,
                          CELL_2x2,
                          6
                        )}
                      </View>

                      {/* Row 5: Logo (2x1) - Right Side */}
                      <View
                        style={{
                          position: 'absolute',
                          left: PADDING + CELL_2x2 + GAP,
                          top: PADDING + CELL_2x2 + GAP + CELL_2x2 + GAP,
                        }}
                      >
                        {renderNatureImageCard(CELL_2x2, CELL_1x1)}
                      </View>
                    </View>
                  </View>
                </ViewShot>
              </View>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.infoTextContainer}>
            <Ionicons
              name='information-circle-outline'
              size={16}
              color='#666666'
            />
            <Text style={styles.infoText}>
              장비 카드를 누르면 표시할 장비를 선택할 수 있습니다.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.saveButton,
              (!isReady || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSaveImage}
            disabled={!isReady || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size='small' color='white' />
            ) : (
              <>
                <Ionicons name='download-outline' size={20} color='white' />
                <Text style={styles.saveButtonText}>사진 저장하기</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Gear Selection Modal */}
        <Modal
          visible={isSelectingGear}
          animationType='slide'
          presentationStyle='pageSheet'
          onRequestClose={() => setIsSelectingGear(false)}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <TouchableOpacity
                onPress={() => setIsSelectingGear(false)}
                style={styles.closeButton}
              >
                <Ionicons name='close' size={24} color='#191F28' />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>장비 선택</Text>
              <View style={{ width: 40 }} />
            </View>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.categoryListContainer}>
                <View style={styles.gearGridList}>
                  {allGearsWithImages.map(gear => (
                    <TouchableOpacity
                      key={gear.getId()}
                      style={styles.gearGridItem}
                      onPress={() => handleSelectGear(gear)}
                    >
                      <Image
                        source={{ uri: gear.getImageUrl?.() }}
                        style={styles.gearGridImage}
                        contentFit='cover'
                      />
                      <View style={styles.gearGridInfo}>
                        <Text style={styles.gearGridName} numberOfLines={1}>
                          {gear.getName()}
                        </Text>
                        <Text style={styles.gearGridWeight}>
                          {Number(gear.getWeight()) >= 1000
                            ? `${(Number(gear.getWeight()) / 1000).toFixed(
                                1
                              )}kg`
                            : `${gear.getWeight()}g`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#191F28',
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
    marginBottom: 20,
    paddingVertical: 20,
  },
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: BG_COLOR,
    position: 'relative',
  },
  cardBase: {
    backgroundColor: CARD_BG_COLOR,
    borderRadius: 30,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardTitleSmall: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cardWeightSmall: {
    fontSize: 20,
    fontWeight: '500',
    color: '#999999',
  },
  big4ImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  big4Image: {
    width: '100%',
    height: '100%',
  },
  gearNameSmall: {
    fontSize: 18,
    color: '#999999',
    fontWeight: '500',
  },
  totalWeightText: {
    fontSize: 80,
    fontWeight: '700',
    color: '#000000',
  },
  totalWeightLabel: {
    fontSize: 24,
    color: '#000000',
    marginTop: 8,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 24,
    justifyContent: 'flex-end',
  },
  cardTitleOverlay: {
    fontSize: 28,
    fontWeight: '700',
    color: '#39FF14',
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191F28',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
  },
  categoryListContainer: {
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  categoryListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191F28',
    marginBottom: 12,
  },
  gearGridList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gearGridItem: {
    width: 108, // (375 - 64) / 3, approximately
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F7',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  gearGridItemSelected: {
    borderColor: '#39FF14',
  },
  gearGridImage: {
    width: '100%',
    height: '70%',
  },
  gearGridCheckmark: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  gearGridInfo: {
    padding: 8,
    height: '30%',
    justifyContent: 'center',
  },
  gearGridName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#191F28',
    marginBottom: 2,
  },
  gearGridWeight: {
    fontSize: 10,
    color: '#666666',
  },
});

export default observer(ShareImageModalView);
