import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { removeBackground } from '@six33/react-native-bg-removal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import * as FileSystem from 'expo-file-system';

import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

// 배경 제거된 이미지 캐시 (재배치 시 재사용)
const processedImageCache = new Map<string, string>();

interface Props {
  selectedGears: (Gear | null)[];
  categories: Array<{
    category: WarehouseFilter;
    gears: Gear[];
  }>;
  totalWeight: string;
  bagName: string;
  isCapturing: boolean;
  isEditMode: boolean;
  backgroundImageUri?: string | null;
  showGearNames: boolean;
  onLoadingChange?: (isLoading: boolean) => void;
}

interface GearPosition {
  id: string;
  gear: Gear;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  processedImageUri: string | null;
}

interface DraggableGearProps {
  gear: GearPosition;
  index: number;
  editablePosition: { x: number; y: number; scale: number; zIndex: number };
  isEditMode: boolean;
  showGearName: boolean;
  onPositionUpdate: (index: number, x: number, y: number) => void;
  onScaleUpdate: (index: number, scale: number) => void;
  onDelete: (index: number) => void;
  onBringToFront: (index: number) => void;
}

const DraggableGear: FC<DraggableGearProps> = ({
  gear,
  index,
  editablePosition,
  isEditMode,
  showGearName,
  onPositionUpdate,
  onScaleUpdate,
  onDelete,
  onBringToFront,
}) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);

  // 제스처 시작 시 저장할 값들
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startScale = useSharedValue(1);

  // 초기 위치 설정 (한 번만)
  useEffect(() => {
    offsetX.value = editablePosition?.x || gear.x;
    offsetY.value = editablePosition?.y || gear.y;
    scale.value = editablePosition?.scale || 1;
    startX.value = editablePosition?.x || gear.x;
    startY.value = editablePosition?.y || gear.y;
    startScale.value = editablePosition?.scale || 1;
  }, []);

  // 팬 제스처 (드래그) - 초고속 반응
  const panGesture = Gesture.Pan()
    .enabled(isEditMode)
    .minDistance(5) // 약간의 거리를 두어 버튼 클릭과 구분
    .maxPointers(1) // 단일 터치만
    .onStart(() => {
      'worklet';
      runOnJS(onBringToFront)(index); // 터치 시 최상위로
    })
    .onChange(e => {
      'worklet';
      offsetX.value += e.changeX;
      offsetY.value += e.changeY;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onPositionUpdate)(index, offsetX.value, offsetY.value);
    });

  // 핀치 제스처 (확대/축소) - 고감도 버전
  const pinchGesture = Gesture.Pinch()
    .enabled(isEditMode)
    .onBegin(() => {
      'worklet';
      runOnJS(onBringToFront)(index); // 터치 시 최상위로
      startScale.value = scale.value;
    })
    .onUpdate(e => {
      'worklet';
      scale.value = startScale.value * e.scale;
    })
    .onEnd(() => {
      'worklet';
      runOnJS(onScaleUpdate)(index, scale.value);
    });

  // 핀치와 팬 제스처를 동시에 사용 (안드로이드 호환성 개선)
  const composed = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [
        { translateX: offsetX.value },
        { translateY: offsetY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.gearContainer,
        {
          width: gear.width,
          height: gear.height,
          zIndex: editablePosition?.zIndex ?? gear.zIndex,
          position: 'absolute',
          left: 0,
          top: 0,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.gearTouchArea]}>
          {/* 터치 영역 확보를 위한 투명 레이어 */}
          <View style={styles.touchableArea} />

          {/* 메인 이미지 (배경 제거된 이미지) */}
          <Image
            source={{
              uri: gear.processedImageUri || gear.gear.getImageUrl?.(),
            }}
            style={styles.gearImage}
            contentFit='contain'
          />

          {/* 장비 이름 */}
          {showGearName && (
            <View style={styles.gearNameContainer}>
              <Text style={styles.gearNameText} numberOfLines={2}>
                {gear.gear.getName()}
              </Text>
            </View>
          )}
        </Animated.View>
      </GestureDetector>

      {/* 편집 모드 삭제 버튼 - GestureDetector 외부에 배치 */}
      {isEditMode && (
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(index)}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.deleteButtonInner}>
            <Text style={styles.deleteButtonText}>×</Text>
          </View>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

const CollageCanvasView: FC<Props> = ({
  categories,
  isCapturing,
  isEditMode,
  backgroundImageUri,
  showGearNames,
  onLoadingChange,
}) => {
  const [gearPositions, setGearPositions] = useState<GearPosition[]>([]);
  const [isProcessing, setIsProcessing] = useState(true);

  // 편집 가능한 위치와 크기를 위한 state
  const [editablePositions, setEditablePositions] = useState<
    Array<{ id: string; x: number; y: number; scale: number; zIndex: number }>
  >([]);

  // 로딩 상태 변경 시 부모에게 알림
  useEffect(() => {
    onLoadingChange?.(isProcessing);
  }, [isProcessing, onLoadingChange]);

  useEffect(() => {
    let isCancelled = false;

    const processGears = async () => {
      setIsProcessing(true);

      // categories에서 이미지가 있는 모든 장비 가져오기
      const allGears: Gear[] = [];
      categories.forEach(cat => {
        cat.gears.forEach(gear => {
          if (gear.getImageUrl?.()) {
            allGears.push(gear);
          }
        });
      });

      // 취소 확인
      if (isCancelled) {
        setIsProcessing(false);
        return;
      }

      // 무게 순으로 정렬 (무거운 것부터)
      allGears.sort((a, b) => {
        const weightA = Number(a.getWeight() || 0);
        const weightB = Number(b.getWeight() || 0);
        return weightB - weightA;
      });

      const positions: GearPosition[] = [];

      // 핀터레스트 스타일 Masonry 레이아웃 설정
      const columns = 4; // 3컬럼 → 4컬럼으로 증가
      const columnGap = 12;
      const topPadding = 15;
      const sidePadding = 15;

      const columnWidth =
        (CANVAS_WIDTH - sidePadding * 2 - columnGap * (columns - 1)) / columns;

      // 각 컬럼의 현재 높이 추적
      const columnHeights: number[] = new Array(columns).fill(topPadding);

      // 배경 제거를 순차적으로 처리 (안드로이드 동시성 이슈 해결)
      const processedImages: (string | null)[] = [];
      for (const gear of allGears) {
        // 취소 확인
        if (isCancelled) {
          setIsProcessing(false);
          return;
        }

        const imageUrl = gear.getImageUrl?.();
        if (!imageUrl) {
          processedImages.push(null);
          continue;
        }

        const gearId = gear.getId();

        // 캐시에서 이미 처리된 이미지 확인
        if (processedImageCache.has(gearId)) {
          processedImages.push(processedImageCache.get(gearId)!);
          continue;
        }

        try {
          // 원격 이미지를 로컬로 다운로드 (안드로이드 파일 경로 이슈 해결)
          let localUri = imageUrl;
          if (
            imageUrl.startsWith('http://') ||
            imageUrl.startsWith('https://')
          ) {
            const filename = imageUrl.substring(imageUrl.lastIndexOf('/') + 1);
            const localPath = `${FileSystem.cacheDirectory}${filename}`;

            const downloadResult = await FileSystem.downloadAsync(
              imageUrl,
              localPath
            );

            // 취소 확인
            if (isCancelled) {
              setIsProcessing(false);
              return;
            }

            localUri = downloadResult.uri;
          }

          // @six33/react-native-bg-removal 사용
          const result = await removeBackground(localUri);

          // 취소 확인
          if (isCancelled) {
            setIsProcessing(false);
            return;
          }

          // 캐시에 저장
          processedImageCache.set(gearId, result);
          processedImages.push(result);
        } catch (error) {
          console.warn('배경 제거 실패, 원본 이미지 사용:', error);
          processedImages.push(imageUrl);
        }
      }

      // 취소 확인
      if (isCancelled) {
        setIsProcessing(false);
        return;
      }

      // 핀터레스트 스타일로 모든 장비 배치
      for (let i = 0; i < allGears.length; i++) {
        const gear = allGears[i];
        try {
          const imageUrl = gear.getImageUrl?.();
          if (!imageUrl) continue;

          // 가장 높이가 낮은 컬럼 찾기
          let targetColumn = 0;
          let minHeight = columnHeights[0];
          for (let col = 1; col < columns; col++) {
            if (columnHeights[col] < minHeight) {
              minHeight = columnHeights[col];
              targetColumn = col;
            }
          }

          // 크기 결정 (랜덤한 높이로 핀터레스트 느낌)
          const width = columnWidth;
          const baseHeight = columnWidth * (1.2 + Math.random() * 0.8); // 1.2 ~ 2.0 비율
          const height = baseHeight;

          // x 위치 (컬럼 기반)
          let x = sidePadding + targetColumn * (columnWidth + columnGap);

          // y 위치 (현재 컬럼 높이)
          let y = columnHeights[targetColumn];

          // 화면 밖으로 나가면 랜덤 컬럼과 랜덤 높이로 배치 (겹치기 허용)
          if (y + height > CANVAS_HEIGHT - 15) {
            // 랜덤 컬럼 선택
            targetColumn = Math.floor(Math.random() * columns);

            // 컬럼 높이를 랜덤 위치로 리셋 (더 자연스러운 겹침)
            const maxY = CANVAS_HEIGHT - height - 15;
            const randomY = topPadding + Math.random() * (maxY - topPadding);
            columnHeights[targetColumn] = randomY;
            y = randomY;

            // x 위치도 새 컬럼에 맞게 재계산
            x = sidePadding + targetColumn * (columnWidth + columnGap);
          }

          // 회전 없음
          const rotation = 0;

          // z-index
          const zIndex = i;

          positions.push({
            id: `${gear.getId()}-${i}`,
            gear,
            x,
            y,
            width,
            height,
            rotation,
            zIndex,
            processedImageUri: processedImages[i],
          });

          // 컬럼 높이 업데이트
          columnHeights[targetColumn] = y + height + columnGap;
        } catch (error) {
          console.error('장비 처리 중 오류:', error);
        }
      }

      // 취소 확인
      if (isCancelled) {
        setIsProcessing(false);
        return;
      }

      setGearPositions(positions);

      // 편집 가능한 위치 초기화
      setEditablePositions(
        positions.map((pos, idx) => ({
          id: pos.id,
          x: pos.x,
          y: pos.y,
          scale: 1,
          zIndex: idx,
        }))
      );

      setIsProcessing(false);
    };

    processGears();

    // cleanup 함수: 컴포넌트가 언마운트되거나 dependencies가 변경될 때 실행
    return () => {
      isCancelled = true;
    };
  }, [categories]);

  // 위치 업데이트 핸들러
  const updatePosition = (index: number, x: number, y: number) => {
    const id = gearPositions[index]?.id;
    if (!id) return;

    setEditablePositions(prev =>
      prev.map(pos => (pos.id === id ? { ...pos, x, y } : pos))
    );
  };

  // 스케일 업데이트 핸들러
  const updateScale = (index: number, scale: number) => {
    const id = gearPositions[index]?.id;
    if (!id) return;

    setEditablePositions(prev =>
      prev.map(pos => (pos.id === id ? { ...pos, scale } : pos))
    );
  };

  // 장비 삭제 핸들러
  const handleDelete = (index: number) => {
    const id = gearPositions[index]?.id;
    if (!id) return;

    setGearPositions(prev => prev.filter(pos => pos.id !== id));
    setEditablePositions(prev => prev.filter(pos => pos.id !== id));
  };

  // 장비를 최상위로 가져오기
  const bringToFront = (index: number) => {
    const id = gearPositions[index]?.id;
    if (!id) return;

    setEditablePositions(prev => {
      const maxZIndex = Math.max(...prev.map(p => p.zIndex));
      return prev.map(pos =>
        pos.id === id ? { ...pos, zIndex: maxZIndex + 1 } : pos
      );
    });
  };

  if (isProcessing && !isCapturing) {
    return (
      <View style={styles.canvas}>
        <View style={styles.loadingContainer}>
          <View style={styles.activityIndicatorWrapper}>
            <ActivityIndicator size='large' color='#000000' />
          </View>
          <Text style={styles.loadingText}>AI로 배경 제거 중...</Text>
          <Text style={styles.loadingSubText}>
            장비 이미지를 처리하고 있습니다
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.canvas}>
      {/* 배경 */}
      {backgroundImageUri ? (
        <Image
          source={{ uri: backgroundImageUri }}
          style={[StyleSheet.absoluteFill, styles.backgroundImage]}
          contentFit='cover'
        />
      ) : null}

      {/* 장비 이미지들 */}
      {gearPositions.map((pos, index) => {
        const editablePos = editablePositions.find(ep => ep.id === pos.id);
        if (!editablePos) return null;

        return (
          <DraggableGear
            key={pos.id}
            gear={pos}
            index={index}
            editablePosition={editablePos}
            isEditMode={isEditMode && !isCapturing}
            showGearName={showGearNames}
            onPositionUpdate={updatePosition}
            onScaleUpdate={updateScale}
            onDelete={handleDelete}
            onBringToFront={bringToFront}
          />
        );
      })}

      {/* 로고 및 URL - 최상단 레이어 */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logoImage}
          contentFit='contain'
        />
        <Text style={styles.urlText}>https://useless.my</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  canvas: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    backgroundColor: '#F5F5F5',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
  },
  gearContainer: {
    position: 'absolute',
  },
  gearTouchArea: {
    backgroundColor: 'transparent',
  },
  touchableArea: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    zIndex: -1,
  },
  gearImage: {
    width: '100%',
    height: '100%',
  },
  gearNameContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  gearNameText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  activityIndicatorWrapper: {
    transform: [{ scale: 2.5 }],
  },
  loadingText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    marginTop: 32,
    fontFamily: 'Inter_700Bold',
  },
  loadingSubText: {
    fontSize: 20,
    color: '#000000',
    fontFamily: 'Inter_600SemiBold',
  },
  deleteButton: {
    position: 'absolute',
    top: -12,
    right: -12,
    width: 48,
    height: 48,
    zIndex: 10,
  },
  deleteButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  deleteButtonText: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
    lineHeight: 32,
    textAlign: 'center',
  },
  logoContainer: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  logoImage: {
    width: 400,
    height: 100,
  },
  urlText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'Inter_700Bold',
  },
});

export default CollageCanvasView;
