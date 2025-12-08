import { observer } from 'mobx-react-lite';
import React, {
  FC,
  useRef,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Circle, G } from 'react-native-svg';
import {
  GestureHandlerRootView,
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import BagDetail from '@/model/bag-detail/BagDetail';
import GearFilter from '@/model/gear/GearFilter';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';

const LOGO_IMG = require('@/assets/images/logo.png');

interface Props {
  visible: boolean;
  onClose: () => void;
  bagDetail: BagDetail;
}

interface CategoryGears {
  category: WarehouseFilter;
  gears: Gear[];
}

type CardSize = 'small' | 'wide' | 'tall' | 'full';

interface LayoutItem {
  type: 'data' | 'logo' | 'chart';
  data?: CategoryGears;
  size: CardSize;
  x: number; // 0~3
  y: number; // 0~3
  id: string;
}

const CATEGORY_IMG_MAP: Record<string, string> = {
  [GearFilter.Backpack]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Backpack.png',
  [GearFilter.Tent]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Tent.png',
  [GearFilter.SleepingBag]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Bed.png',
  [GearFilter.Mat]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Rolled-Up%20Newspaper.png',
  [GearFilter.Lantern]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Flashlight.png',
  [GearFilter.Cooking]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Pot%20of%20Food.png',
  [GearFilter.Clothing]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Coat.png',
  [GearFilter.Furniture]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Chair.png',
  [GearFilter.Electronic]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Mobile%20Phone.png',
  [GearFilter.Food]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Food/Rice%20Ball.png',
  [GearFilter.Etc]:
    'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Package.png',
};

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

// 네온 그린 테마 색상
const NEON_GREEN = '#D4F73F';
const CHART_COLORS = [
  '#FF6B6B', // 코랄 레드
  '#4ECDC4', // 틸
  '#FFE66D', // 옐로우
  '#95E1D3', // 민트
  '#F38181', // 살몬
  '#AA96DA', // 라벤더
  '#FCBAD3', // 핑크
  '#A8D8EA', // 스카이 블루
  '#FF9F43', // 오렌지
  '#5F27CD', // 퍼플
  '#00D2D3', // 시안
];

const GAP = 8;
const CANVAS_PADDING = 16;
const FIXED_CANVAS_WIDTH = 375; // 기준 해상도 너비 고정

const ShareImageModalView: FC<Props> = ({ visible, onClose, bagDetail }) => {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const viewShotRef = useRef<ViewShot>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // 고정 너비 기준으로 셀 크기 계산
  const canvasWidth = FIXED_CANVAS_WIDTH;
  const cellSize = (canvasWidth - CANVAS_PADDING * 2 - GAP * 3) / 4;
  // 차트 사이즈 조정 (라벨 공간 확보를 위해 축소)
  const chartRadius = cellSize * 0.5;
  const chartSize = cellSize * 2 + GAP; // 컨테이너 전체 크기 (2x2 셀 크기)
  const chartCenter = chartSize / 2;

  // 화면 표시를 위한 스케일 계산
  // 화면 너비에서 좌우 패딩(40)을 뺀 공간에 375가 들어가도록 축소/확대
  const displayScale = (windowWidth - 40) / FIXED_CANVAS_WIDTH;

  // 데이터 준비 (무게순 정렬) 및 상태 관리
  const [sortedCategories, setSortedCategories] = useState<CategoryGears[]>([]);
  // 숨김 처리된 카테고리 ID 관리
  const [hiddenCategoryIds, setHiddenCategoryIds] = useState<Set<string>>(
    new Set()
  );

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
    setHiddenCategoryIds(new Set()); // 데이터 변경 시 숨김 초기화
  }, [bagDetail]);

  // 실제 화면에 표시할 활성 카테고리
  const activeCategories = useMemo(() => {
    return sortedCategories.filter(
      cat => !hiddenCategoryIds.has(cat.category.getFilter())
    );
  }, [sortedCategories, hiddenCategoryIds]);

  // 각 카테고리의 크기 상태 관리
  const [categorySizes, setCategorySizes] = useState<Record<string, CardSize>>(
    {}
  );

  // 초기 크기 설정
  useEffect(() => {
    if (visible && activeCategories.length > 0) {
      const initialSizes: Record<string, CardSize> = {};
      activeCategories.forEach((cat, index) => {
        if (cat.category.getFilter() === GearFilter.SleepingBag) {
          initialSizes[cat.category.getFilter()] = 'tall';
        } else if (index < 2 && activeCategories.length <= 10) {
          initialSizes[cat.category.getFilter()] = 'wide';
        } else {
          initialSizes[cat.category.getFilter()] = 'small';
        }
      });
      // 기존 사이즈 유지하면서 없는 것만 추가하거나, 아예 초기화하거나.
      // 여기서는 visible이 true가 될 때마다 리셋되는 로직이었음.
      // 편집 중에는 visible이 true인 상태이므로 리셋 안됨.
      setCategorySizes(prev => {
        // 이미 설정된 값이 있으면 유지 (편집 중일 수 있으므로)
        if (Object.keys(prev).length > 0) return prev;
        return initialSizes;
      });

      setTimeout(() => setIsReady(true), 500);
    } else if (!visible) {
      setIsReady(false);
      setIsEditMode(false);
      // 모달 닫힐 때 사이즈 초기화는 선택사항. 여기서는 유지하지 않음.
      setCategorySizes({});
      setHiddenCategoryIds(new Set()); // 모달 닫힐 때 숨김 초기화
    }
  }, [visible, sortedCategories]); // sortedCategories가 변경될 때만 초기화 로직 실행 (activeCategories 변경 시마다 리셋되지 않도록)

  // 레이아웃 계산 로직
  const layoutItems = useMemo(() => {
    const items: LayoutItem[] = [];
    const grid: boolean[][] = Array(4)
      .fill(false)
      .map(() => Array(4).fill(false));

    // 차트 영역 (중앙 2x2)
    grid[1][1] = true;
    grid[1][2] = true;
    grid[2][1] = true;
    grid[2][2] = true;
    items.push({
      type: 'chart',
      size: 'full', // 실제로는 2x2지만 로직상 예외 처리
      x: 1,
      y: 1,
      id: 'chart',
    });

    // 공간 확인 헬퍼
    const canPlace = (x: number, y: number, w: number, h: number) => {
      if (x + w > 4 || y + h > 4) return false;
      for (let i = y; i < y + h; i++) {
        for (let j = x; j < x + w; j++) {
          if (grid[i][j]) return false;
        }
      }
      return true;
    };

    // 공간 점유 처리
    const occupy = (x: number, y: number, w: number, h: number) => {
      for (let i = y; i < y + h; i++) {
        for (let j = x; j < x + w; j++) {
          grid[i][j] = true;
        }
      }
    };

    // 침낭 우선 배치 (왼쪽 중앙, Tall 사이즈일 경우)
    const sleepingBagCat = activeCategories.find(
      c => c.category.getFilter() === GearFilter.SleepingBag
    );
    const otherCategories = activeCategories.filter(
      c => c.category.getFilter() !== GearFilter.SleepingBag
    );

    if (sleepingBagCat) {
      const size = categorySizes[GearFilter.SleepingBag];
      // 사이즈가 Tall이고 (0,1) 위치가 비어있으면 강제 배치
      if ((size === 'tall' || !size) && canPlace(0, 1, 1, 2)) {
        occupy(0, 1, 1, 2);
        items.push({
          type: 'data',
          data: sleepingBagCat,
          size: 'tall',
          x: 0,
          y: 1,
          id: sleepingBagCat.category.getFilter(),
        });
      } else {
        // 조건에 안맞으면 일반 배치 목록의 맨 앞에 추가 (우선순위 높게)
        otherCategories.unshift(sleepingBagCat);
      }
    }

    // 데이터 배치 (otherCategories 사용)
    otherCategories.forEach(cat => {
      const size = categorySizes[cat.category.getFilter()] || 'small';
      let w = 1,
        h = 1;
      if (size === 'wide') w = 2;
      if (size === 'tall') h = 2;
      if (size === 'full') w = 4;

      let placed = false;
      // 좌상단부터 빈 공간 탐색
      for (let y = 0; y < 4; y++) {
        for (let x = 0; x < 4; x++) {
          if (canPlace(x, y, w, h)) {
            occupy(x, y, w, h);
            items.push({
              type: 'data',
              data: cat,
              size,
              x,
              y,
              id: cat.category.getFilter(),
            });
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      // 배치 실패 시, 크기를 줄여서 재시도 (Fallback: Small)
      if (!placed && size !== 'small') {
        // 강제로 small로 시도
        for (let y = 0; y < 4; y++) {
          for (let x = 0; x < 4; x++) {
            if (canPlace(x, y, 1, 1)) {
              occupy(x, y, 1, 1);
              items.push({
                type: 'data',
                data: cat,
                size: 'small',
                x,
                y,
                id: cat.category.getFilter(),
              });
              placed = true;
              break;
            }
          }
          if (placed) break;
        }
      }
    });

    // 남은 공간 로고 채우기
    // 1. 가능한 큰 공간부터 채우기 (Wide, Tall, Small 순)
    // 여기서는 단순화를 위해 1x1로 채우고 인접한 것을 합치는 로직보다는
    // 그냥 1x1 빈칸을 모두 로고로 채움
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        if (!grid[y][x]) {
          // 혹시 2x1(Wide) 공간이 있는지 확인해서 Wide 로고 배치?
          if (canPlace(x, y, 2, 1)) {
            occupy(x, y, 2, 1);
            items.push({
              type: 'logo',
              size: 'wide',
              x,
              y,
              id: `logo-${x}-${y}`,
            });
          } else {
            occupy(x, y, 1, 1);
            items.push({
              type: 'logo',
              size: 'small',
              x,
              y,
              id: `logo-${x}-${y}`,
            });
          }
        }
      }
    }

    return items;
  }, [activeCategories, categorySizes]);

  const handleSwap = useCallback(
    (fromId: string, toId: string) => {
      const fromIndex = sortedCategories.findIndex(
        c => c.category.getFilter() === fromId
      );
      const toIndex = sortedCategories.findIndex(
        c => c.category.getFilter() === toId
      );

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return;

      const newCategories = [...sortedCategories];
      const temp = newCategories[fromIndex];
      newCategories[fromIndex] = newCategories[toIndex];
      newCategories[toIndex] = temp;

      setSortedCategories(newCategories);
    },
    [sortedCategories]
  );

  const handleSaveImage = async () => {
    if (!viewShotRef.current) {
      Alert.alert('오류', '이미지를 캡처할 수 없습니다.');
      return;
    }

    setIsSaving(true);

    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '사진을 저장하려면 사진 라이브러리 접근 권한이 필요합니다.'
        );
        setIsSaving(false);
        return;
      }

      const uri = await viewShotRef.current.capture?.();
      if (!uri) {
        throw new Error('캡처 실패');
      }

      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('저장 완료', '이미지가 사진 라이브러리에 저장되었습니다.');
    } catch (error) {
      console.error('이미지 저장 실패:', error);
      Alert.alert('저장 실패', '이미지를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModalClose = () => {
    setIsReady(false);
    onClose();
  };

  // 카드 크기 변경 핸들러
  const toggleCardSize = (filter: string) => {
    if (!isEditMode) return;

    setCategorySizes(prev => {
      const currentSize = prev[filter] || 'small';
      const nextSizeMap: Record<CardSize, CardSize> = {
        small: 'wide',
        wide: 'tall',
        tall: 'full',
        full: 'small',
      };
      let nextSize = nextSizeMap[currentSize];

      // Full 사이즈는 배치가 까다로우므로 배치 가능한지 미리 체크할 수도 있지만,
      // 현재 로직상 배치 불가능하면 Small로 Fallback되므로 그냥 설정해본다.
      // 다만 사용자 피드백을 위해 배치 불가능하면 다음 사이즈로 넘어가는게 좋을 수도 있다.

      return {
        ...prev,
        [filter]: nextSize,
      };
    });
  };

  const bagName = bagDetail.getName();
  const totalWeight = bagDetail.getWeight();
  const dateRange = bagDetail.getDate();

  // 카테고리별 무게 계산 (차트용) - 전체 카테고리 사용
  const categoryWeights = sortedCategories.map((cat, index) => {
    const weight = cat.gears.reduce(
      (sum, gear) => sum + Number(gear.getWeight() || 0),
      0
    );
    return {
      weight,
      color: CHART_COLORS[index % CHART_COLORS.length],
      categoryFilter: cat.category.getFilter(), // 필터 정보 추가
    };
  });

  const totalWeightNum = categoryWeights.reduce((sum, c) => sum + c.weight, 0);

  // 파이 차트 경로 생성
  const createPieSlices = () => {
    if (totalWeightNum === 0) return [];

    const cx = chartCenter;
    const cy = chartCenter;
    const radius = chartRadius;
    let startAngle = -90;

    return categoryWeights.map((cat, index) => {
      const percentage = cat.weight / totalWeightNum;
      const angle = percentage * 360;
      const endAngle = startAngle + angle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArc = angle > 180 ? 1 : 0;

      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      startAngle = endAngle;

      return {
        d,
        color: cat.color,
        key: index,
      };
    });
  };

  const pieSlices = createPieSlices();

  const getGearInfo = (categoryData: CategoryGears) => {
    const filter = categoryData.category.getFilter();

    // 원래 로직에서 색상 인덱스를 찾기 위해 전체 데이터에서 인덱스를 찾음
    const index = sortedCategories.findIndex(
      c => c.category.getFilter() === filter
    );

    const categoryName =
      CATEGORY_NAME_MAP[filter] || categoryData.category.getName();
    const gears = categoryData.gears;
    const firstGearImg = gears[0]?.getImageUrl?.() || '';
    const hasRealImage = !!firstGearImg;
    const imgUrl = firstGearImg;
    const fallbackImg =
      CATEGORY_IMG_MAP[filter] || CATEGORY_IMG_MAP[GearFilter.Etc];
    const weight = gears.reduce(
      (sum, gear) => sum + Number(gear.getWeight() || 0),
      0
    );
    const gearCount = gears.length;
    const gearNames = gears.slice(0, 3).map(gear => {
      const company = gear.getCompanyKorean() || gear.getCompany();
      const name = gear.getName();
      return company ? `${company}\n${name}` : name;
    });

    const weightDisplay =
      weight >= 1000 ? `${(weight / 1000).toFixed(1)}kg` : `${weight}g`;
    const color = CHART_COLORS[index % CHART_COLORS.length];

    return {
      categoryName,
      imgUrl,
      fallbackImg,
      hasRealImage,
      gearNames,
      gearCount,
      weightDisplay,
      color,
    };
  };

  // 드래그 중인 아이템이 어떤 아이템 위에 있는지(Hover) 상태 관리
  const [hoveredTargetId, setHoveredTargetId] = useState<string | null>(null);

  const handleHover = useCallback((targetId: string | null) => {
    setHoveredTargetId(targetId);
  }, []);

  const handleDrop = useCallback(
    (draggedId: string, absoluteX: number, absoluteY: number) => {
      const targetItem = layoutItems.find(item => {
        if (item.type !== 'data') return false;
        if (item.id === draggedId) return false;

        const w =
          item.size === 'full'
            ? cellSize * 4 + GAP * 3
            : item.size === 'wide'
            ? cellSize * 2 + GAP
            : cellSize;
        const h = item.size === 'tall' ? cellSize * 2 + GAP : cellSize;

        const left = item.x * (cellSize + GAP) + CANVAS_PADDING;
        const top = item.y * (cellSize + GAP) + CANVAS_PADDING;

        return (
          absoluteX >= left &&
          absoluteX <= left + w &&
          absoluteY >= top &&
          absoluteY <= top + h
        );
      });

      if (targetItem) {
        handleSwap(draggedId, targetItem.id);
      }
      setHoveredTargetId(null);
    },
    [layoutItems, cellSize, handleSwap]
  );

  const renderCard = (item: LayoutItem) => {
    if (item.type === 'chart') return renderChartCard(item);
    if (item.type === 'logo') return renderLogoCard(item);

    if (!item.data) return null;

    const {
      categoryName,
      imgUrl,
      fallbackImg,
      hasRealImage,
      gearNames,
      gearCount,
      weightDisplay,
    } = getGearInfo(item.data);

    const width =
      item.size === 'full'
        ? cellSize * 4 + GAP * 3
        : item.size === 'wide'
        ? cellSize * 2 + GAP
        : cellSize;

    const height = item.size === 'tall' ? cellSize * 2 + GAP : cellSize;

    // DraggableCard에 전달할 컨텐츠
    return (
      <DraggableCard
        key={item.id}
        item={item}
        cellSize={cellSize}
        gap={GAP}
        padding={CANVAS_PADDING}
        isEditMode={isEditMode}
        onDrop={handleDrop}
        onHover={handleHover}
        layoutItems={layoutItems}
        scale={displayScale} // 스케일 전달
        onPress={() => toggleCardSize(item.data!.category.getFilter())}
      >
        <View
          style={[
            styles.card,
            { width: '100%', height: '100%' },
            hasRealImage && { backgroundColor: 'transparent' },
            isEditMode && styles.editModeCard,
            hoveredTargetId === item.id && styles.hoveredCard, // 호버 효과 추가
          ]}
        >
          {hoveredTargetId === item.id && (
            <View style={styles.placeholderOverlay} />
          )}
          {hasRealImage ? (
            <Image
              source={{ uri: imgUrl }}
              style={[
                styles.fullCardImg,
                item.size === 'wide' && styles.wideCardImg,
              ]}
              contentFit='cover'
            />
          ) : (
            <Image
              source={{ uri: fallbackImg }}
              style={[
                styles.fallbackImg,
                {
                  width: Math.min(width, height) * 0.6,
                  height: Math.min(width, height) * 0.6,
                },
              ]}
              contentFit='contain'
            />
          )}
          <View style={styles.cardOverlay}>
            <View
              style={[
                styles.gearInfoGroup,
                item.size === 'wide' && { width: '50%' },
              ]}
            >
              <Text style={styles.overlayCategory}>{categoryName}</Text>
              <Text style={styles.overlayGearName} numberOfLines={2}>
                {gearNames[0]}
              </Text>
              {gearCount > 1 && (
                <Text style={styles.overlayGearCount}>
                  외 {gearCount - 1}개
                </Text>
              )}
            </View>
            <View style={styles.overlayWeightBadge}>
              <Text style={styles.overlayWeightText}>{weightDisplay}</Text>
            </View>
          </View>

          {isEditMode && (
            <View style={styles.editBadge}>
              <Ionicons name='resize' size={12} color='white' />
            </View>
          )}
        </View>
      </DraggableCard>
    );
  };

  const renderLogoCard = (item: LayoutItem) => {
    const width = item.size === 'wide' ? cellSize * 2 + GAP : cellSize;
    const height = cellSize;
    const top = item.y * (cellSize + GAP) + CANVAS_PADDING;
    const left = item.x * (cellSize + GAP) + CANVAS_PADDING;

    return (
      <View
        key={item.id}
        style={[
          styles.card,
          {
            position: 'absolute',
            top,
            left,
            width,
            height,
            alignItems: 'center',
            justifyContent: 'center',
          },
        ]}
      >
        <Image
          source={LOGO_IMG}
          style={{ width: '50%', height: '50%', opacity: 1 }}
          contentFit='contain'
          tintColor='#FFFFFF'
        />
      </View>
    );
  };

  const renderChartCard = (item: LayoutItem) => {
    const legendData = sortedCategories.map((cat, index) => {
      const weight = cat.gears.reduce(
        (sum, gear) => sum + Number(gear.getWeight() || 0),
        0
      );
      const percentage =
        totalWeightNum > 0 ? ((weight / totalWeightNum) * 100).toFixed(0) : 0;
      const filter = cat.category.getFilter();
      const categoryName = CATEGORY_NAME_MAP[filter] || cat.category.getName();
      const weightDisplay =
        weight >= 1000 ? `${(weight / 1000).toFixed(1)}kg` : `${weight}g`;
      return {
        categoryName,
        percentage,
        weightDisplay,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    const width = cellSize * 2 + GAP;
    const height = cellSize * 2 + GAP;
    const top = item.y * (cellSize + GAP) + CANVAS_PADDING;
    const left = item.x * (cellSize + GAP) + CANVAS_PADDING;

    return (
      <View
        key={item.id}
        style={[
          styles.chartCard,
          {
            position: 'absolute',
            top,
            left,
            width,
            height,
          },
        ]}
      >
        <Text style={styles.chartTitle}>{bagName}</Text>
        <Text style={styles.chartSubtitle}>{dateRange}</Text>
        <View style={styles.chartContent}>
          <View
            style={[
              styles.chartContainer,
              { width: chartSize * 0.5, height: chartSize * 0.5 },
            ]}
          >
            <Svg width={chartSize * 0.5} height={chartSize * 0.5}>
              <G
                transform={`translate(${(chartSize * 0.5) / 2 - chartCenter}, ${
                  (chartSize * 0.5) / 2 - chartCenter
                })`}
              >
                {pieSlices.map(slice => (
                  <Path key={slice.key} d={slice.d} fill={slice.color} />
                ))}
                <Circle
                  cx={chartCenter}
                  cy={chartCenter}
                  r={chartRadius * 0.6}
                  fill='#000000'
                />
              </G>
            </Svg>
            <View style={styles.chartCenter}>
              <Text style={[styles.totalWeightValue, { fontSize: 9 }]}>
                {totalWeight}kg
              </Text>
            </View>
          </View>

          <View style={styles.legendContainer}>
            {legendData.slice(0, 5).map((item, index) => (
              <View key={index} style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: item.color }]}
                />
                <Text style={styles.legendCategory} numberOfLines={1}>
                  {item.categoryName}
                </Text>
                <Text style={styles.legendValue}>{item.weightDisplay}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  // 카테고리 표시 토글 핸들러
  const toggleCategoryVisibility = (filter: string) => {
    setHiddenCategoryIds(prev => {
      const next = new Set(prev);
      if (next.has(filter)) {
        next.delete(filter);
      } else {
        next.add(filter);
      }
      return next;
    });
  };

  const renderCategoryList = () => {
    return (
      <View style={styles.categoryListContainer}>
        <Text style={styles.categoryListTitle}>표시할 카테고리 선택</Text>
        <View style={styles.categoryList}>
          {sortedCategories.map(cat => {
            const filter = cat.category.getFilter();
            const isHidden = hiddenCategoryIds.has(filter);
            const categoryName =
              CATEGORY_NAME_MAP[filter] || cat.category.getName();
            const weight = cat.gears.reduce(
              (sum, gear) => sum + Number(gear.getWeight() || 0),
              0
            );
            const weightDisplay =
              weight >= 1000 ? `${(weight / 1000).toFixed(1)}kg` : `${weight}g`;

            return (
              <TouchableOpacity
                key={filter}
                style={styles.categoryListItem}
                onPress={() => toggleCategoryVisibility(filter)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isHidden ? 'square-outline' : 'checkbox'}
                  size={20}
                  color={isHidden ? '#CCCCCC' : '#191F28'}
                />
                <Text
                  style={[
                    styles.categoryListItemText,
                    isHidden && styles.categoryListItemTextHidden,
                  ]}
                >
                  {categoryName}
                </Text>
                <Text style={styles.categoryListItemWeight}>
                  {weightDisplay}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={handleModalClose}
    >
      <GestureHandlerRootView style={[styles.container]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleModalClose}
          >
            <Ionicons name='close' size={24} color='#191F28' />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>공유 이미지</Text>
          <TouchableOpacity
            style={styles.headerRightButton}
            onPress={() => setIsEditMode(!isEditMode)}
          >
            <Text
              style={[
                styles.headerRightText,
                isEditMode && styles.headerRightTextActive,
              ]}
            >
              {isEditMode ? '완료' : '편집'}
            </Text>
          </TouchableOpacity>
        </View>

        {isEditMode && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeText}>
              카드를 터치하여 크기를 변경하세요
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 스케일링을 위한 래퍼 뷰 */}
          <View
            style={{
              width: canvasWidth * displayScale,
              height: canvasWidth * displayScale, // 정사각형 가정
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: canvasWidth,
                height: canvasWidth,
                transform: [{ scale: displayScale }],
              }}
            >
              <ViewShot
                ref={viewShotRef}
                options={{ format: 'png', quality: 1, width: canvasWidth * 3 }} // 저장 시 3배 고해상도
                style={styles.viewShot}
              >
                <View style={[styles.canvas, { width: canvasWidth }]}>
                  {layoutItems.map(item => renderCard(item))}
                </View>
              </ViewShot>
            </View>
          </View>

          {/* 카테고리 리스트 추가 */}
          {renderCategoryList()}
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
      </GestureHandlerRootView>
    </Modal>
  );
};

interface DraggableCardProps {
  item: LayoutItem;
  cellSize: number;
  gap: number;
  padding: number;
  isEditMode: boolean;
  layoutItems: LayoutItem[];
  scale: number; // 스케일 props 추가
  onDrop: (draggedId: string, x: number, y: number) => void;
  onHover: (targetId: string | null) => void;
  onPress: () => void;
  children: React.ReactNode;
}

const DraggableCard: FC<DraggableCardProps> = ({
  item,
  cellSize,
  gap,
  padding,
  isEditMode,
  layoutItems,
  scale,
  onDrop,
  onHover,
  onPress,
  children,
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  const gestureHandler = useAnimatedGestureHandler<
    PanGestureHandlerGestureEvent,
    { startX: number; startY: number }
  >({
    onStart: (_, ctx) => {
      if (!isEditMode) return;
      ctx.startX = translateX.value;
      ctx.startY = translateY.value;
      isDragging.value = true;
    },
    onActive: (event, ctx) => {
      if (!isEditMode) return;
      // scale로 나누어 보정
      translateX.value = ctx.startX + event.translationX / scale;
      translateY.value = ctx.startY + event.translationY / scale;

      // 현재 드래그 중인 카드의 중심 좌표 계산
      const startLeft = item.x * (cellSize + gap) + padding;
      const startTop = item.y * (cellSize + gap) + padding;

      let w = cellSize;
      let h = cellSize;
      if (item.size === 'wide') w = cellSize * 2 + gap;
      if (item.size === 'tall') h = cellSize * 2 + gap;
      if (item.size === 'full') w = cellSize * 4 + gap * 3;

      const currentCenterX = startLeft + translateX.value + w / 2;
      const currentCenterY = startTop + translateY.value + h / 2;

      // 타겟 찾기 로직을 worklet 안에서 실행하기 위해 layoutItems를 props로 받아와야 함
      // 하지만 복잡한 로직을 JS 스레드로 넘기는 것이 안전함
      runOnJS(findTargetAndHover)(
        currentCenterX,
        currentCenterY,
        layoutItems,
        item.id,
        onHover,
        cellSize,
        gap,
        padding
      );
    },
    onEnd: () => {
      if (!isEditMode) return;
      isDragging.value = false;

      // 현재 아이템의 시작 좌표
      const startLeft = item.x * (cellSize + gap) + padding;
      const startTop = item.y * (cellSize + gap) + padding;

      // 카드 크기 계산
      let w = cellSize;
      let h = cellSize;
      if (item.size === 'wide') w = cellSize * 2 + gap;
      if (item.size === 'tall') h = cellSize * 2 + gap;
      if (item.size === 'full') w = cellSize * 4 + gap * 3;

      // 드롭된 중심 좌표
      const dropCenterX = startLeft + translateX.value + w / 2;
      const dropCenterY = startTop + translateY.value + h / 2;

      runOnJS(onDrop)(item.id, dropCenterX, dropCenterY);

      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: withSpring(isDragging.value ? 1.1 : 1) },
      ],
      zIndex: isDragging.value ? 100 : 1,
    };
  });

  const width =
    item.size === 'full'
      ? cellSize * 4 + gap * 3
      : item.size === 'wide'
      ? cellSize * 2 + gap
      : cellSize;

  const height = item.size === 'tall' ? cellSize * 2 + gap : cellSize;

  const top = item.y * (cellSize + gap) + padding;
  const left = item.x * (cellSize + gap) + padding;

  return (
    <PanGestureHandler onGestureEvent={gestureHandler} enabled={isEditMode}>
      <Animated.View
        style={[
          {
            position: 'absolute',
            top,
            left,
            width,
            height,
          },
          animatedStyle,
        ]}
      >
        <TouchableOpacity
          activeOpacity={isEditMode ? 0.9 : 1}
          onPress={onPress}
          style={{ flex: 1 }}
        >
          {children}
        </TouchableOpacity>
      </Animated.View>
    </PanGestureHandler>
  );
};

// 헬퍼 함수: JS 스레드에서 실행될 호버 타겟 찾기 로직
const findTargetAndHover = (
  x: number,
  y: number,
  items: LayoutItem[],
  draggedId: string,
  onHover: (id: string | null) => void,
  cellSize: number,
  gap: number,
  padding: number
) => {
  const target = items.find(item => {
    if (item.type !== 'data') return false; // 데이터 카드만 스왑 가능
    if (item.id === draggedId) return false;

    let w = cellSize;
    let h = cellSize;
    if (item.size === 'wide') w = cellSize * 2 + gap;
    if (item.size === 'tall') h = cellSize * 2 + gap;
    if (item.size === 'full') w = cellSize * 4 + gap * 3;

    const left = item.x * (cellSize + gap) + padding;
    const top = item.y * (cellSize + gap) + padding;

    return x >= left && x <= left + w && y >= top && y <= top + h;
  });

  onHover(target ? target.id : null);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#191F28',
  },
  headerRightButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  headerRightText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  headerRightTextActive: {
    color: '#3182F6',
    fontWeight: '700',
  },
  editNotice: {
    backgroundColor: '#3182F6',
    padding: 8,
    alignItems: 'center',
  },
  editNoticeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  viewShot: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  canvas: {
    aspectRatio: 1,
    backgroundColor: NEON_GREEN,
    // relative로 변경 (내부는 absolute 배치)
    position: 'relative',
  },
  card: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 10,
    overflow: 'hidden',
  },
  hoveredCard: {
    borderColor: '#3182F6',
    borderWidth: 2,
    opacity: 0.8,
  },
  placeholderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(49, 130, 246, 0.3)', // 파란색 반투명 오버레이
    zIndex: 20,
  },
  editModeCard: {
    borderWidth: 2,
    borderColor: '#3182F6',
  },
  editBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#3182F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  fullCardImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  wideCardImg: {
    left: '45%',
    top: 6,
    bottom: 6,
    right: 6,
    borderRadius: 12,
  },
  fallbackImg: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: 0.8,
  },
  cardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  gearInfoGroup: {
    gap: 2,
  },
  overlayCategory: {
    fontSize: 6,
    fontWeight: '600',
    color: '#ffffff',
    opacity: 0.9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  overlayGearName: {
    fontSize: 7,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: -0.3,
    lineHeight: 9,
  },
  overlayGearCount: {
    fontSize: 7,
    color: '#ffffff',
    opacity: 0.7,
  },
  overlayWeightBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  overlayWeightText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },
  chartCard: {
    backgroundColor: '#000000',
    borderRadius: 16,
    padding: 12,
    // alignItems: 'center', // 중앙 정렬 해제 (왼쪽 정렬을 위해)
    // justifyContent: 'center',
  },
  chartTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  chartSubtitle: {
    fontSize: 7,
    color: '#888888',
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  chartTitleAbsolute: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: -0.5,
    zIndex: 10,
  },
  chartSubtitleAbsolute: {
    position: 'absolute',
    top: 28,
    left: 0,
    right: 0,
    fontSize: 7,
    color: '#888888',
    textAlign: 'center',
    letterSpacing: -0.2,
    zIndex: 10,
  },
  chartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingLeft: 4,
  },
  chartContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartCenter: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalWeightValue: {
    fontSize: 9, // 폰트 사이즈 복구
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  legendContainer: {
    flex: 1,
    gap: 4, // 범례 아이템 간격
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    flexShrink: 0,
  },
  legendCategory: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  legendValue: {
    fontSize: 8,
    color: '#cccccc',
    flexShrink: 0,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
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
  categoryListContainer: {
    width: '100%',
    paddingHorizontal: 10,
    marginTop: 24,
    marginBottom: 20,
  },
  categoryListTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#191F28',
    marginBottom: 12,
  },
  categoryList: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 4,
  },
  categoryListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F4F6',
  },
  categoryListItemText: {
    fontSize: 15,
    color: '#333333',
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  categoryListItemTextHidden: {
    color: '#AAAAAA',
    textDecorationLine: 'line-through',
  },
  categoryListItemWeight: {
    fontSize: 13,
    color: '#888888',
  },
});

export default observer(ShareImageModalView);
