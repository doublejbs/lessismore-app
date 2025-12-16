import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';

import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import ShareImageCanvasView from './ShareImageCanvasView';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CardSize } from './constants';

interface Props {
  viewShotRef: React.RefObject<ViewShot | null>;
  selectedGears: (Gear | null)[];
  cardSizes: Record<number, CardSize>;
  categories: Array<{
    category: WarehouseFilter;
    gears: Gear[];
  }>;
  totalWeight: string;
  totalWeightNum: number;
  bagName: string;
  weightColorIndex: number;
  customBackgroundUri: string | null;
  isLightBackground: boolean;
  isEditMode: boolean;
  isCapturing: boolean;
  displayScale: number;
  onSlotClick: (index: number) => void;
  onRemoveGear: (index: number) => void;
  onCardSizeChange: (index: number) => void;
  onWeightColorChange: () => void;
  onBackgroundChange: (uri: string, isLight: boolean) => void;
}

const GridLayoutView: FC<Props> = ({
  viewShotRef,
  selectedGears,
  cardSizes,
  categories,
  totalWeight,
  totalWeightNum,
  bagName,
  weightColorIndex,
  customBackgroundUri,
  isLightBackground,
  isEditMode,
  isCapturing,
  displayScale,
  onSlotClick,
  onRemoveGear,
  onCardSizeChange,
  onWeightColorChange,
  onBackgroundChange,
}) => {
  return (
    <>
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
                categories={categories}
                totalWeight={totalWeight}
                totalWeightNum={totalWeightNum}
                bagName={bagName}
                weightColorIndex={weightColorIndex}
                customBackgroundUri={customBackgroundUri}
                isLightBackground={isLightBackground}
                isEditMode={isEditMode}
                isCapturing={isCapturing}
                onSlotClick={onSlotClick}
                onRemoveGear={onRemoveGear}
                onCardSizeChange={onCardSizeChange}
                onWeightColorChange={onWeightColorChange}
                onBackgroundChange={onBackgroundChange}
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
    </>
  );
};

const styles = StyleSheet.create({
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
    paddingTop: 20,
    paddingBottom: 8,
    backgroundColor: 'white',
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
});

export default GridLayoutView;
