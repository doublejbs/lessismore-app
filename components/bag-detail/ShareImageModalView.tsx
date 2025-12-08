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
import { PlaywriteNZ_400Regular } from '@expo-google-fonts/playwrite-nz';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';

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

// 무게 카드 색상 팔레트
const WEIGHT_GRADIENTS: readonly [string, string][] = [
  ['#90D830', '#60C000'], // Lime Green
  ['#FF2D55', '#CC0033'], // Pink/Red
  ['#00FFD9', '#00CCA8'], // Cyan/Turquoise
  ['#FFD60A', '#CCA800'], // Yellow
  ['#30D158', '#26A346'], // Green
  ['#64D2FF', '#33AACC'], // Light Blue
  ['#BF5AF2', '#9933CC'], // Purple
  ['#FF9F0A', '#CC7F08'], // Orange
];

// Layout Constants (optimized for 4:5 Instagram ratio: 1080 x 1350)
const PADDING = 24;
const GAP = 20;

// Grid-based Layout System (4 columns)
const CELL_SIZE = 243; // Base cell size
const CELL_1x1 = CELL_SIZE;
const CELL_2x2 = CELL_SIZE * 2 + GAP; // 243 * 2 + 20 = 506
// Total width: 24 + 243*4 + 20*3 + 24 = 1080 ✓
// Total height: 24 + 506 + 20 + 506 + 20 + 243 + 31 = 1350 ✓

// Chart Colors (iOS Fitness App Palette - Vibrant & Energetic)
const CHART_COLORS = [
  '#FF2D55', // Move Ring - Pink/Red
  '#AFFC41', // Exercise Ring - Lime Green
  '#00FFD9', // Stand Ring - Cyan/Turquoise
  '#FF453A', // Red
  '#FFD60A', // Yellow
  '#30D158', // Green
  '#64D2FF', // Light Blue
  '#BF5AF2', // Purple
  '#FF9F0A', // Orange
  '#AC8E68', // Brown
];

const DARK_TEXT_MAIN = '#FFFFFF'; // White
const DARK_TEXT_SUB = '#999999'; // Grey

const ShareImageModalView: FC<Props> = ({ visible, onClose, bagDetail }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // Load Fonts
  const [fontsLoaded] = useFonts({
    PlaywriteNZ_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
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

  // 카드 크기 상태 (오른쪽 상단: 1,2,3,4 / 왼쪽 하단: 5,6)
  type CardSize = '1x1' | '2x1' | '1x2' | '2x2';
  const [cardSizes, setCardSizes] = useState<Record<number, CardSize>>({
    1: '1x1',
    2: '1x1',
    3: '1x1',
    4: '1x1',
    5: '1x2',
    6: '1x2',
  });

  // 무게 카드 색상 인덱스
  const [weightColorIndex, setWeightColorIndex] = useState(0);

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

    // 초기 선택: 특정 카테고리 우선 배치
    const gearsWithImg: Gear[] = [];
    data.forEach(cat => {
      gearsWithImg.push(...cat.gears.filter(g => g.getImageUrl?.()));
    });

    const gearArray = Array(7).fill(null);

    // 0번 위치: 텐트
    const tentGear = gearsWithImg.find(
      g => g.getCategory?.() === GearFilter.Tent
    );
    if (tentGear) {
      gearArray[0] = tentGear;
    }

    // 5번 위치: 배낭
    const backpackGear = gearsWithImg.find(
      g => g.getCategory?.() === GearFilter.Backpack && g !== tentGear
    );
    if (backpackGear) {
      gearArray[5] = backpackGear;
    }

    // 6번 위치: 침낭
    const sleepingBagGear = gearsWithImg.find(
      g =>
        g.getCategory?.() === GearFilter.SleepingBag &&
        g !== tentGear &&
        g !== backpackGear
    );
    if (sleepingBagGear) {
      gearArray[6] = sleepingBagGear;
    }

    // 나머지 위치 (1,2,3,4): 아직 배치되지 않은 장비들을 무게 순으로
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
  }, [bagDetail]);

  useEffect(() => {
    if (visible) {
      setIsReady(false);
      setTimeout(() => setIsReady(true), 2000);
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

      // 캡처 전에 버튼 숨기기
      setIsCapturing(true);
      // 화면이 업데이트될 시간 대기
      await new Promise(resolve => setTimeout(resolve, 100));

      const uri = await viewShotRef.current.capture?.();

      // 캡처 후 버튼 다시 보이기
      setIsCapturing(false);

      if (uri) {
        await MediaLibrary.saveToLibraryAsync(uri);
        Alert.alert('저장 완료', '이미지가 저장되었습니다.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('저장 실패', '오류가 발생했습니다.');
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

    // 오른쪽 상단 카드들 (1,2,3,4): 1x1 -> 2x1 -> 2x2 -> 1x1
    if (index >= 1 && index <= 4) {
      if (currentSize === '1x1') {
        nextSize = '2x1';
        // 같은 행의 다른 카드만 1x1로 리셋
        if (index === 1 || index === 2) {
          // 첫 번째 행 (1,2)
          [1, 2].forEach(i => {
            if (i !== index) {
              newSizes[i] = '1x1';
            }
          });
        } else {
          // 두 번째 행 (3,4)
          [3, 4].forEach(i => {
            if (i !== index) {
              newSizes[i] = '1x1';
            }
          });
        }
      } else if (currentSize === '2x1') {
        nextSize = '2x2';
        // 모든 다른 카드들 1x1로 리셋
        [1, 2, 3, 4].forEach(i => {
          if (i !== index) {
            newSizes[i] = '1x1';
          }
        });
      } else {
        // 2x2 -> 1x1
        nextSize = '1x1';
      }
    }
    // 왼쪽 하단 카드들 (5,6): 1x2 -> 2x2 -> 1x2
    else if (index >= 5 && index <= 6) {
      if (currentSize === '1x2') {
        nextSize = '2x2';
        // 다른 카드 1x2로 리셋
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
    setWeightColorIndex(prev => (prev + 1) % WEIGHT_GRADIENTS.length);
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
    slotIndex: number,
    showResizeButton: boolean = true,
    isCapturing: boolean = false
  ) => {
    const canResize = [1, 2, 3, 4, 5, 6].includes(slotIndex);
    const isClickable = true; // 모든 카드 클릭 가능

    return (
      <TouchableOpacity
        style={[
          styles.cardBase,
          {
            width,
            height,
            padding: 0,
            overflow: 'hidden',
            backgroundColor: gear
              ? CARD_BG_COLOR
              : isCapturing
              ? BG_COLOR
              : '#2A2A2A',
            borderWidth: gear
              ? showResizeButton
                ? 2
                : 0
              : isCapturing
              ? 0
              : 2,
            borderColor: gear
              ? showResizeButton
                ? 'rgba(175, 252, 65, 0.4)'
                : 'transparent'
              : '#444444',
            borderStyle: gear ? 'solid' : 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
        onPress={() => handleSlotClick(slotIndex)}
        onLongPress={() => gear && handleRemoveGear(slotIndex)}
        activeOpacity={0.7}
      >
        {gear ? (
          <>
            <Image
              source={{ uri: gear.getImageUrl?.() }}
              style={{ width: '100%', height: '100%' }}
              contentFit='cover'
            />
            {isClickable && showResizeButton && (
              <View style={styles.changeIconBadge}>
                <Ionicons name='image-outline' size={16} color='white' />
              </View>
            )}
            {canResize && showResizeButton && (
              <TouchableOpacity
                style={styles.resizeButton}
                onPress={e => {
                  e.stopPropagation();
                  handleCardSizeChange(slotIndex);
                }}
              >
                <Ionicons name='expand-outline' size={20} color='white' />
              </TouchableOpacity>
            )}
          </>
        ) : !isCapturing ? (
          <>
            <Ionicons name='add-circle-outline' size={48} color='#666666' />
            {isClickable && (
              <Text style={styles.clickHintText}>탭하여 장비 선택</Text>
            )}
          </>
        ) : null}
      </TouchableOpacity>
    );
  };

  // 오른쪽 상단 카드들 레이아웃 계산 (Gear 1,2,3,4)
  const renderRightTopCards = (
    showResizeButton: boolean = true,
    isCapturing: boolean = false
  ) => {
    const cards = [];

    // 2x2 확대된 카드가 있는지 확인
    const has2x2 = [1, 2, 3, 4].find(i => cardSizes[i] === '2x2');
    if (has2x2) {
      // 하나만 2x2로 표시
      cards.push(
        <View
          key={has2x2}
          style={{
            position: 'absolute',
            left: PADDING + CELL_2x2 + GAP,
            top: PADDING,
          }}
        >
          {renderGearCard(
            gearsWithImages[has2x2],
            CELL_2x2,
            CELL_2x2,
            has2x2,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
      return cards;
    }

    // Row 1 (위): Gear 1,2
    const size1 = cardSizes[1];
    const size2 = cardSizes[2];

    if (size1 === '2x1') {
      // Gear 1이 2x1로 확대
      cards.push(
        <View
          key={1}
          style={{
            position: 'absolute',
            left: PADDING + CELL_2x2 + GAP,
            top: PADDING,
          }}
        >
          {renderGearCard(
            gearsWithImages[1],
            CELL_2x2,
            CELL_1x1,
            1,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else if (size2 === '2x1') {
      // Gear 2가 2x1로 확대
      cards.push(
        <View
          key={2}
          style={{
            position: 'absolute',
            left: PADDING + CELL_2x2 + GAP,
            top: PADDING,
          }}
        >
          {renderGearCard(
            gearsWithImages[2],
            CELL_2x2,
            CELL_1x1,
            2,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else {
      // Gear 1,2 모두 1x1
      cards.push(
        <View
          key={1}
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
            1,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
      cards.push(
        <View
          key={2}
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
            2,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    }

    // Row 2 (아래): Gear 3,4
    const size3 = cardSizes[3];
    const size4 = cardSizes[4];

    if (size3 === '2x1') {
      // Gear 3이 2x1로 확대
      cards.push(
        <View
          key={3}
          style={{
            position: 'absolute',
            left: PADDING + CELL_2x2 + GAP,
            top: PADDING + CELL_1x1 + GAP,
          }}
        >
          {renderGearCard(
            gearsWithImages[3],
            CELL_2x2,
            CELL_1x1,
            3,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else if (size4 === '2x1') {
      // Gear 4가 2x1로 확대
      cards.push(
        <View
          key={4}
          style={{
            position: 'absolute',
            left: PADDING + CELL_2x2 + GAP,
            top: PADDING + CELL_1x1 + GAP,
          }}
        >
          {renderGearCard(
            gearsWithImages[4],
            CELL_2x2,
            CELL_1x1,
            4,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else {
      // Gear 3,4 모두 1x1
      cards.push(
        <View
          key={3}
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
            3,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
      cards.push(
        <View
          key={4}
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
            4,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    }

    return cards;
  };

  // 왼쪽 하단 카드들 레이아웃 계산 (Gear 5,6)
  const renderLeftBottomCards = (
    showResizeButton: boolean = true,
    isCapturing: boolean = false
  ) => {
    const cards = [];
    const size5 = cardSizes[5];
    const size6 = cardSizes[6];

    if (size5 === '2x2') {
      // Gear5만 2x2로 표시
      cards.push(
        <View
          key={5}
          style={{
            position: 'absolute',
            left: PADDING,
            top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
          }}
        >
          {renderGearCard(
            gearsWithImages[5],
            CELL_2x2,
            CELL_2x2,
            5,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else if (size6 === '2x2') {
      // Gear6만 2x2로 표시
      cards.push(
        <View
          key={6}
          style={{
            position: 'absolute',
            left: PADDING,
            top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
          }}
        >
          {renderGearCard(
            gearsWithImages[6],
            CELL_2x2,
            CELL_2x2,
            6,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    } else {
      // 둘 다 1x2로 표시
      cards.push(
        <View
          key={5}
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
            5,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
      cards.push(
        <View
          key={6}
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
            6,
            showResizeButton,
            isCapturing
          )}
        </View>
      );
    }

    return cards;
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
            borderWidth: 1.5,
            borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle light border
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
                fontFamily: 'Inter_700Bold',
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
                    fontFamily: 'Inter_600SemiBold',
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
                    fontFamily: 'Inter_700Bold',
                  }}
                >
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
                <Text
                  style={{
                    fontSize: 14,
                    color: DARK_TEXT_SUB,
                    fontFamily: 'Inter_400Regular',
                  }}
                >
                  {(slice.percentage * 100).toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderTotalWeightCard = (width: number, height: number) => {
    const currentGradient = WEIGHT_GRADIENTS[weightColorIndex];

    return (
      <TouchableOpacity
        onPress={handleWeightColorChange}
        activeOpacity={0.8}
        style={{ width, height }}
      >
        <LinearGradient
          colors={currentGradient}
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
          {!isCapturing && (
            <View style={styles.weightColorIconBadge}>
              <Ionicons name='color-palette-outline' size={16} color='white' />
            </View>
          )}
          <Text
            style={[
              styles.totalWeightText,
              {
                color: 'white',
                fontSize: width > 300 ? 90 : 70,
                fontFamily: 'Inter_700Bold',
                fontWeight: '700',
                textShadowColor: 'rgba(255, 255, 255, 0.3)',
                textShadowOffset: { width: 2, height: 2 },
                textShadowRadius: 8,
              },
            ]}
          >
            {totalWeight}kg
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

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
            borderWidth: !isCapturing ? 2 : 0,
            borderColor: 'rgba(175, 252, 65, 0.4)',
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
        {/* 배경 변경 힌트 아이콘 */}
        {!isCapturing && (
          <View style={styles.backgroundChangeIconBadge}>
            <Ionicons name='image-outline' size={16} color='white' />
          </View>
        )}
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
            fontFamily: 'Inter_400Regular',
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
              장비 정보를 분석하고 있습니다
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
                      {/* Row 1-2: Gear1 (2x2) - 고정 */}
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
                          0,
                          !isCapturing,
                          isCapturing
                        )}
                      </View>

                      {/* Row 1-2: 오른쪽 상단 카드들 (Gear 1,2,3,4) - 동적 */}
                      {renderRightTopCards(!isCapturing, isCapturing)}

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

                      {/* Row 4-5: 왼쪽 하단 카드들 (Gear 5,6) - 동적 */}
                      {renderLeftBottomCards(!isCapturing, isCapturing)}

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

          {/* 가이드 텍스트 */}
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
              <Ionicons
                name='color-palette-outline'
                size={16}
                color='#666666'
              />
              <Text style={styles.infoText}>
                무게 카드를 누르면 색상 변경이 가능합니다.
              </Text>
            </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.bottomContainer,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
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
    fontFamily: 'Inter_600SemiBold',
  },
  guideContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  infoTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '400',
    fontFamily: 'Inter_400Regular',
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
  resizeButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    padding: 8,
    zIndex: 10,
  },
  changeIconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  backgroundChangeIconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  weightColorIconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 6,
    zIndex: 10,
  },
  clickHintText: {
    position: 'absolute',
    bottom: 16,
    fontSize: 12,
    color: '#999999',
    fontFamily: 'Inter_400Regular',
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
