import React, { FC, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { removeBackground } from '@six33/react-native-bg-removal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  useAnimatedReaction,
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
  isMultiTouch: boolean;
  isMultiTouchSV: Animated.SharedValue<number>;
  selectedGearId: string | null;
  activeScale: Animated.SharedValue<number>;
  showGearName: boolean;
  onSelect: (id: string, index: number) => void;
  onPositionUpdate: (index: number, x: number, y: number) => void;
  onDelete: (index: number) => void;
  onBringToFront: (index: number) => void;
}

const DraggableGear: FC<DraggableGearProps> = ({
  gear,
  index,
  editablePosition,
  isEditMode,
  isMultiTouch,
  isMultiTouchSV,
  selectedGearId,
  activeScale,
  showGearName,
  onSelect,
  onPositionUpdate,
  onDelete,
  onBringToFront,
}) => {
  const offsetX = useSharedValue(0);
  const offsetY = useSharedValue(0);
  const scale = useSharedValue(1);
  const panLocked = useSharedValue(0);
  const ignoreSelectRef = useRef(false);

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

  // 캔버스에 2개 이상 터치가 있으면 드래그 즉시 차단
  useEffect(() => {
    panLocked.value = isMultiTouch ? 1 : 0;
  }, [isMultiTouch]);

  const isSelected = selectedGearId === gear.id;

  // 부모의 activeScale이 변하면, 선택된 장비의 scale을 업데이트
  useAnimatedReaction(
    () => activeScale.value,
    currentActiveScale => {
      if (isSelected && currentActiveScale > 0) {
        scale.value = currentActiveScale;
      }
    },
    [isSelected] // activeScale은 sharedValue라 의존성 필요 없음, isSelected 바뀌면 반응
  );

  // 핀치 제스처 제거 (전역에서 처리)
  // const pinchGesture = Gesture.Pinch() ...

  // 팬 제스처 (드래그) - 정확히 한 손가락일 때만
  const panGesture = Gesture.Pan()
    .enabled(isEditMode && isSelected && !isMultiTouch)
    .minDistance(10) // 드래그 최소 거리
    .minPointers(1) // 최소 1개
    .maxPointers(1) // 최대 1개 (정확히 1개만)
    .onStart(() => {
      'worklet';
      if (panLocked.value) return;
      runOnJS(onBringToFront)(index); // 터치 시 최상위로
    })
    .onChange(e => {
      'worklet';
      if (panLocked.value) return;
      offsetX.value += e.changeX;
      offsetY.value += e.changeY;
    })
    .onEnd(() => {
      'worklet';
      if (panLocked.value) return;
      runOnJS(onPositionUpdate)(index, offsetX.value, offsetY.value);
    });

  // 선택은 Pressable(onPress)로 처리 (안드로이드 호환성)
  const composed = panGesture;

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

  // 삭제 버튼 역 scale 스타일 (확대/축소 영향 제거)
  const deleteButtonStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: 1 / scale.value }],
    };
  });

  // 장비 이름 텍스트 역 scale 스타일 (확대/축소 영향 제거)
  const gearNameStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: 1 / scale.value }],
    };
  });

  // 선택/가이드 UI도 확대/축소 영향 제거
  const inverseScaleStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ scale: 1 / scale.value }],
    };
  });

  // 최소 터치 영역 보장 (핀치 제스처를 위해 충분히 크게)
  const minTouchSize = 150;
  const touchWidth = Math.max(gear.width, minTouchSize);
  const touchHeight = Math.max(gear.height, minTouchSize);
  const imageOffsetX = (touchWidth - gear.width) / 2;
  const imageOffsetY = (touchHeight - gear.height) / 2;

  return (
    <Animated.View
      style={[
        styles.gearContainer,
        {
          width: touchWidth,
          height: touchHeight,
          zIndex: editablePosition?.zIndex ?? gear.zIndex,
          position: 'absolute',
          left: -imageOffsetX,
          top: -imageOffsetY,
        },
        animatedStyle,
      ]}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.gearTouchArea]}>
          {/* 터치 영역 확보를 위한 투명 레이어 */}
          <View style={styles.touchableArea} pointerEvents='none' />

          {/* 메인 이미지 (배경 제거된 이미지) */}
          <View
            style={{
              position: 'absolute',
              left: imageOffsetX,
              top: imageOffsetY,
              width: gear.width,
              height: gear.height,
              overflow: 'visible',
            }}
          >
            <Image
              source={{
                uri: gear.processedImageUri || gear.gear.getImageUrl?.(),
              }}
              style={styles.gearImage}
              contentFit='contain'
            />

            {/* 편집 모드 안내 UI (선택된 장비만) */}
            {isEditMode && isSelected && (
              <View pointerEvents='none' style={StyleSheet.absoluteFill}>
                <View style={styles.selectedOutline} />

                {/* 네 모서리 크기 조절 핸들 */}
                <Animated.View
                  style={[
                    styles.resizeHandle,
                    styles.resizeHandleTopLeft,
                    inverseScaleStyle,
                  ]}
                >
                  <View style={styles.resizeHandleCircle} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.resizeHandle,
                    styles.resizeHandleTopRight,
                    inverseScaleStyle,
                  ]}
                >
                  <View style={styles.resizeHandleCircle} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.resizeHandle,
                    styles.resizeHandleBottomLeft,
                    inverseScaleStyle,
                  ]}
                >
                  <View style={styles.resizeHandleCircle} />
                </Animated.View>
                <Animated.View
                  style={[
                    styles.resizeHandle,
                    styles.resizeHandleBottomRight,
                    inverseScaleStyle,
                  ]}
                >
                  <View style={styles.resizeHandleCircle} />
                </Animated.View>
              </View>
            )}

            {/* 장비 이름 */}
            {showGearName && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'visible',
                }}
              >
                <Animated.View
                  style={[
                    {
                      overflow: 'visible',
                      minWidth: 500,
                    },
                    gearNameStyle,
                  ]}
                >
                  <Text
                    style={styles.gearNameText}
                    numberOfLines={1}
                    ellipsizeMode='clip'
                  >
                    {gear.gear.getName()}
                  </Text>
                </Animated.View>
              </View>
            )}
          </View>

          {/* 선택 전용 터치 레이어 (안드로이드에서 Tap 제스처 이슈 회피)
              - 반드시 최상단에 있어야 이미지가 터치를 먹지 않음
           */}
          {isEditMode && !isSelected && (
            <Pressable
              style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
              onTouchStart={e => {
                // 2손가락 핀치 시작 시 press가 먼저 먹는 케이스 방지
                ignoreSelectRef.current =
                  (e.nativeEvent.touches?.length ?? 0) >= 2;
              }}
              onTouchEnd={() => {
                ignoreSelectRef.current = false;
              }}
              onTouchCancel={() => {
                ignoreSelectRef.current = false;
              }}
              onPress={() => {
                if (ignoreSelectRef.current) return;
                if (isMultiTouchSV.value) return;
                onSelect(gear.id, index);
              }}
              disabled={isMultiTouch}
              android_disableSound
              hitSlop={12}
            />
          )}
        </Animated.View>
      </GestureDetector>

      {/* 편집 모드 삭제 버튼 - 하단 가운데, scale 영향 없음 (선택된 장비만 노출) */}
      {isEditMode && isSelected && (
        <Animated.View
          style={[
            styles.deleteButtonContainer,
            {
              top: imageOffsetY + gear.height + 10, // 이미지 하단 + 간격
              left: touchWidth / 2 - 100, // 버튼 너비(200)의 절반
            },
            deleteButtonStyle,
          ]}
        >
          <TouchableOpacity
            onPress={() => onDelete(index)}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.deleteButton}
          >
            <Text style={styles.deleteButtonText}>삭제</Text>
          </TouchableOpacity>
        </Animated.View>
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
  const [isMultiTouch, setIsMultiTouch] = useState(false);
  const [selectedGearId, setSelectedGearId] = useState<string | null>(null);
  const isMultiTouchSV = useSharedValue(0);

  // 전역 핀치 줌을 위한 Shared Value
  const activeScale = useSharedValue(1);
  const startScale = useSharedValue(1);

  // 로딩 상태 변경 시 부모에게 알림
  const [editablePositions, setEditablePositions] = useState<
    Array<{ id: string; x: number; y: number; scale: number; zIndex: number }>
  >([]);

  // 로딩 상태 변경 시 부모에게 알림
  useEffect(() => {
    onLoadingChange?.(isProcessing);
  }, [isProcessing, onLoadingChange]);

  // 선택된 장비가 바뀌면, 그 장비의 저장된 scale로 activeScale을 동기화
  // (선택 직후 activeScale을 바로 바꾸면, 이전 선택 장비가 그 값을 "잠깐" 받아서 스케일이 되돌아갈 수 있음)
  useEffect(() => {
    if (!selectedGearId) return;
    const pos = editablePositions.find(p => p.id === selectedGearId);
    activeScale.value = pos?.scale ?? 1;
  }, [selectedGearId, editablePositions, activeScale]);

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

      // Greedy Packing Algorithm 설정 (macOS Mission Control 스타일)
      const padding = 15;
      const gap = 8;
      const minGearWidth = 160; // 콜라주에서 장비 최소 크기(가로)

      // 전체 영역 계산
      const canvasArea =
        (CANVAS_WIDTH - padding * 2) * (CANVAS_HEIGHT - padding * 2);

      // 장비 개수에 따른 평균 크기 계산 (전체 영역을 90% 채우도록)
      const targetArea = canvasArea * 0.9;
      const averageItemArea = targetArea / allGears.length;
      const averageItemSize = Math.sqrt(averageItemArea);

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

      // 충돌 체크 함수
      const checkCollision = (
        x: number,
        y: number,
        width: number,
        height: number,
        positions: GearPosition[]
      ): boolean => {
        // 로고 영역과 충돌 체크 (좌상단)
        const logoX = 24;
        const logoY = 24;
        const logoWidth = 320;
        const logoHeight = 110; // 로고 + URL 텍스트 포함

        if (
          x < logoX + logoWidth + gap &&
          x + width + gap > logoX &&
          y < logoY + logoHeight + gap &&
          y + height + gap > logoY
        ) {
          return true; // 로고와 충돌
        }

        // 다른 장비와 충돌 체크
        for (const pos of positions) {
          if (
            x < pos.x + pos.width + gap &&
            x + width + gap > pos.x &&
            y < pos.y + pos.height + gap &&
            y + height + gap > pos.y
          ) {
            return true; // 충돌
          }
        }
        return false; // 충돌 없음
      };

      // 최적의 위치 찾기 함수 (Greedy: 가장 위쪽, 왼쪽 우선)
      const findBestPosition = (
        width: number,
        height: number,
        positions: GearPosition[]
      ): { x: number; y: number } | null => {
        const canvasWidth = CANVAS_WIDTH - padding * 2;
        const canvasHeight = CANVAS_HEIGHT - padding * 2;
        const stepSize = 5; // 탐색 간격을 줄여 더 촘촘하게

        // 위쪽부터 아래쪽으로, 왼쪽부터 오른쪽으로 탐색
        for (
          let y = padding;
          y + height <= canvasHeight + padding;
          y += stepSize
        ) {
          for (
            let x = padding;
            x + width <= canvasWidth + padding;
            x += stepSize
          ) {
            if (!checkCollision(x, y, width, height, positions)) {
              return { x, y };
            }
          }
        }

        return null; // 배치 불가능
      };

      // 크기를 줄여가며 배치 시도
      const findPositionWithResize = (
        initialWidth: number,
        initialHeight: number,
        positions: GearPosition[],
        minWidth: number
      ): { x: number; y: number; width: number; height: number } | null => {
        // 처음엔 원래 크기로 시도
        let pos = findBestPosition(initialWidth, initialHeight, positions);
        if (pos) {
          return { ...pos, width: initialWidth, height: initialHeight };
        }

        // 크기를 줄여가며 재시도 (0.8배, 0.6배, 0.5배)
        const scaleFacs = [0.8, 0.6, 0.5];
        for (const scale of scaleFacs) {
          // 전달받은 최소 크기 아래로는 줄이지 않음
          const scaledWidth = Math.max(minWidth, initialWidth * scale);
          const scaledHeight = scaledWidth * (initialHeight / initialWidth);
          pos = findBestPosition(scaledWidth, scaledHeight, positions);
          if (pos) {
            return { ...pos, width: scaledWidth, height: scaledHeight };
          }
        }

        return null;
      };

      // Greedy Packing Algorithm으로 모든 장비 배치
      for (let i = 0; i < allGears.length; i++) {
        const gear = allGears[i];
        try {
          const imageUrl = gear.getImageUrl?.();
          if (!imageUrl) continue;

          // 무게에 따라 크기 결정 (무거울수록 크게, 전체 평균 크기 기준)
          const weight = Number(gear.getWeight() || 0);
          const maxWeight = Math.max(
            ...allGears.map(g => Number(g.getWeight() || 0))
          );
          const normalizedWeight = maxWeight > 0 ? weight / maxWeight : 0.5;

          // 평균 크기의 0.7배 ~ 1.5배 범위에서 무게에 따라 결정
          const sizeFactor = 0.7 + normalizedWeight * 0.8;
          const size = averageItemSize * sizeFactor;

          // 다양한 비율로 Mission Control 느낌
          const aspectRatioOptions = [0.8, 0.9, 1.0, 1.1, 1.2];
          const aspectRatio = aspectRatioOptions[i % aspectRatioOptions.length];
          const baseWidth = size;

          // 최적의 위치 찾기 (크기 조정 포함)
          // 배치 실패 시 최소 크기를 단계적으로 낮춰가며 재시도
          const minWidthCandidates = [
            minGearWidth,
            Math.max(140, minGearWidth - 20),
            Math.max(120, minGearWidth - 40),
            Math.max(100, minGearWidth - 60),
            80,
          ];

          let placed: {
            x: number;
            y: number;
            width: number;
            height: number;
          } | null = null;

          for (const candidateMinWidth of minWidthCandidates) {
            const initialWidth = Math.max(candidateMinWidth, baseWidth);
            const initialHeight = initialWidth * aspectRatio;
            placed = findPositionWithResize(
              initialWidth,
              initialHeight,
              positions,
              candidateMinWidth
            );
            if (placed) break;
          }

          if (!placed) {
            // 그래도 배치할 공간이 없으면 스킵
            console.warn('배치 공간 부족:', gear.getName());
            continue;
          }

          const { x, y, width, height } = placed;

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
        } catch (error) {
          console.error('장비 처리 중 오류:', error);
        }
      }

      // 취소 확인
      if (isCancelled) {
        setIsProcessing(false);
        return;
      }

      // 캔버스 중앙에 가장 가까운 장비를 자동 선택
      const canvasCenterX = CANVAS_WIDTH / 2;
      const canvasCenterY = CANVAS_HEIGHT / 2;
      let closestIndex = -1;
      let minDistance = Number.POSITIVE_INFINITY;

      for (let i = 0; i < positions.length; i++) {
        const pos = positions[i];
        const gearCenterX = pos.x + pos.width / 2;
        const gearCenterY = pos.y + pos.height / 2;
        const distance = Math.sqrt(
          Math.pow(gearCenterX - canvasCenterX, 2) +
            Math.pow(gearCenterY - canvasCenterY, 2)
        );
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = i;
        }
      }

      const initialSelectedId =
        closestIndex >= 0 ? positions[closestIndex].id : null;

      setGearPositions(positions);
      setSelectedGearId(initialSelectedId);

      // 초기 선택된 장비의 scale을 activeScale에 반영
      if (initialSelectedId) {
        // 초기 생성 시 scale은 무조건 1
        activeScale.value = 1;
      }

      // 편집 가능한 위치 초기화
      setEditablePositions(
        positions.map((pos, idx) => ({
          id: pos.id,
          x: pos.x,
          y: pos.y,
          scale: 1,
          zIndex:
            initialSelectedId && pos.id === initialSelectedId
              ? positions.length + 1
              : idx,
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

  const handleSelectGear = (id: string, index: number) => {
    setSelectedGearId(id);
    bringToFront(index);
  };

  // 핀치 종료 처리를 위한 JS 함수
  const handlePinchEnd = (id: string, newScale: number) => {
    const index = gearPositions.findIndex(g => g.id === id);
    if (index >= 0) {
      updateScale(index, newScale);
    }
  };

  // 전역 핀치 제스처 (선택된 장비 확대/축소)
  const canvasPinch = Gesture.Pinch()
    .enabled(isEditMode && !!selectedGearId)
    .onBegin(() => {
      'worklet';
      startScale.value = activeScale.value;
    })
    .onUpdate(e => {
      'worklet';
      activeScale.value = Math.max(
        0.5,
        Math.min(3, startScale.value * e.scale)
      );
    })
    .onEnd(() => {
      'worklet';
      if (selectedGearId) {
        // 인덱스 찾기 (id로는 안되므로 runOnJS 내부에서 찾아야 함)
        // 여기선 activeScale.value만 넘겨주고 JS측에서 처리
        // 근데 updateScale 함수는 index를 받음.
        // JS 함수 하나 만들어서 처리
        runOnJS(handlePinchEnd)(selectedGearId, activeScale.value);
      }
    });

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
    <GestureDetector gesture={canvasPinch}>
      <View
        style={styles.canvas}
        onTouchStart={e => {
          const multi = (e.nativeEvent.touches?.length ?? 0) >= 2;
          isMultiTouchSV.value = multi ? 1 : 0;
          setIsMultiTouch(multi);
        }}
        onTouchMove={e => {
          const multi = (e.nativeEvent.touches?.length ?? 0) >= 2;
          isMultiTouchSV.value = multi ? 1 : 0;
          setIsMultiTouch(multi);
        }}
        onTouchEnd={e => {
          const multi = (e.nativeEvent.touches?.length ?? 0) >= 2;
          isMultiTouchSV.value = multi ? 1 : 0;
          setIsMultiTouch(multi);
        }}
        onTouchCancel={() => {
          isMultiTouchSV.value = 0;
          setIsMultiTouch(false);
        }}
      >
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
              isMultiTouch={isMultiTouch}
              isMultiTouchSV={isMultiTouchSV}
              selectedGearId={selectedGearId}
              activeScale={activeScale}
              showGearName={showGearNames}
              onSelect={handleSelectGear}
              onPositionUpdate={updatePosition}
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
    </GestureDetector>
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
    overflow: 'visible',
  },
  gearTouchArea: {
    backgroundColor: 'transparent',
    overflow: 'visible',
    width: '100%',
    height: '100%',
    position: 'relative',
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
    overflow: 'visible',
  },
  gearNameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
    fontFamily: 'Inter_700Bold',
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  selectedOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: 'rgba(0, 0, 0, 0.6)',
  },
  centerMoveIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  resizeHandle: {
    position: 'absolute',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resizeHandleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  resizeHandleTopLeft: {
    top: -10,
    left: -10,
  },
  resizeHandleTopRight: {
    top: -10,
    right: -10,
  },
  resizeHandleBottomLeft: {
    bottom: -10,
    left: -10,
  },
  resizeHandleBottomRight: {
    bottom: -10,
    right: -10,
  },
  tapHintContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tapHintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  tapHintText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'Inter_700Bold',
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
  deleteButtonContainer: {
    position: 'absolute',
    zIndex: 90,
    opacity: 1,
  },
  deleteButton: {
    width: 200,
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 40,
    backgroundColor: 'rgb(0, 0, 0)',
    opacity: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 90,
  },
  deleteButtonText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  logoContainer: {
    position: 'absolute',
    left: 24,
    top: 24,
    alignItems: 'center',
    zIndex: 80,
  },
  logoImage: {
    width: 320,
    height: 80,
  },
  urlText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
    fontFamily: 'Inter_700Bold',
  },
});

export default CollageCanvasView;
