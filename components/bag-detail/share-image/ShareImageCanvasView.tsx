import React, { FC } from 'react';
import { View, StyleSheet } from 'react-native';

import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import GearCardView from './GearCardView';
import ChartCardView from './ChartCardView';
import WeightCardView from './WeightCardView';
import LogoCardView from './LogoCardView';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDING,
  GAP,
  CELL_1x1,
  CELL_2x2,
  CardSize,
} from './constants';

interface Props {
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
  onSlotClick: (index: number) => void;
  onRemoveGear: (index: number) => void;
  onCardSizeChange: (index: number) => void;
  onWeightColorChange: () => void;
  onBackgroundChange: (uri: string, isLight: boolean) => void;
}

const ShareImageCanvasView: FC<Props> = ({
  selectedGears,
  cardSizes,
  categories,
  totalWeight,
  totalWeightNum,
  weightColorIndex,
  customBackgroundUri,
  isLightBackground,
  isEditMode,
  isCapturing,
  onSlotClick,
  onRemoveGear,
  onCardSizeChange,
  onWeightColorChange,
  onBackgroundChange,
}) => {
  const renderRightTopCards = () => {
    const cards = [];
    const has2x2 = [1, 2, 3, 4].find(i => cardSizes[i] === '2x2');

    if (has2x2) {
      cards.push(
        <View
          key={has2x2}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[has2x2]}
            width={CELL_2x2}
            height={CELL_2x2}
            slotIndex={has2x2}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
      return cards;
    }

    const size1 = cardSizes[1];
    const size2 = cardSizes[2];

    if (size1 === '2x1') {
      cards.push(
        <View
          key={1}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[1]}
            width={CELL_2x2}
            height={CELL_1x1}
            slotIndex={1}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else if (size2 === '2x1') {
      cards.push(
        <View
          key={2}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[2]}
            width={CELL_2x2}
            height={CELL_1x1}
            slotIndex={2}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else {
      cards.push(
        <View
          key={1}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[1]}
            width={CELL_1x1}
            height={CELL_1x1}
            slotIndex={1}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
      cards.push(
        <View
          key={2}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[2]}
            width={CELL_1x1}
            height={CELL_1x1}
            slotIndex={2}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    }

    const size3 = cardSizes[3];
    const size4 = cardSizes[4];

    if (size3 === '2x1') {
      cards.push(
        <View
          key={3}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[3]}
            width={CELL_2x2}
            height={CELL_1x1}
            slotIndex={3}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else if (size4 === '2x1') {
      cards.push(
        <View
          key={4}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[4]}
            width={CELL_2x2}
            height={CELL_1x1}
            slotIndex={4}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else {
      cards.push(
        <View
          key={3}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[3]}
            width={CELL_1x1}
            height={CELL_1x1}
            slotIndex={3}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
      cards.push(
        <View
          key={4}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
              top: PADDING + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[4]}
            width={CELL_1x1}
            height={CELL_1x1}
            slotIndex={4}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    }

    return cards;
  };

  const renderLeftBottomCards = () => {
    const cards = [];
    const size5 = cardSizes[5];
    const size6 = cardSizes[6];

    if (size5 === '2x2') {
      cards.push(
        <View
          key={5}
          style={[
            styles.cardWrapper,
            {
              left: PADDING,
              top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[5]}
            width={CELL_2x2}
            height={CELL_2x2}
            slotIndex={5}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else if (size6 === '2x2') {
      cards.push(
        <View
          key={6}
          style={[
            styles.cardWrapper,
            {
              left: PADDING,
              top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[6]}
            width={CELL_2x2}
            height={CELL_2x2}
            slotIndex={6}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    } else {
      cards.push(
        <View
          key={5}
          style={[
            styles.cardWrapper,
            {
              left: PADDING,
              top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[5]}
            width={CELL_1x1}
            height={CELL_2x2}
            slotIndex={5}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
      cards.push(
        <View
          key={6}
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_1x1 + GAP,
              top: PADDING + CELL_2x2 + GAP + CELL_1x1 + GAP,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[6]}
            width={CELL_1x1}
            height={CELL_2x2}
            slotIndex={6}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>
      );
    }

    return cards;
  };

  return (
    <View style={styles.canvas}>
      <View style={StyleSheet.absoluteFill}>
        {/* Row 1-2: Gear0 (2x2) - 고정 */}
        <View
          style={[
            styles.cardWrapper,
            {
              left: PADDING,
              top: PADDING,
            },
          ]}
        >
          <GearCardView
            gear={selectedGears[0]}
            width={CELL_2x2}
            height={CELL_2x2}
            slotIndex={0}
            showResizeButton={isEditMode && !isCapturing}
            isCapturing={isCapturing}
            onSlotClick={onSlotClick}
            onRemoveGear={onRemoveGear}
            onCardSizeChange={onCardSizeChange}
          />
        </View>

        {/* Row 1-2: 오른쪽 상단 카드들 (Gear 1,2,3,4) - 동적 */}
        {renderRightTopCards()}

        {/* Row 3-4: TotalWeight (2x1) | Chart (2x2) */}
        <View
          style={[
            styles.cardWrapper,
            {
              left: PADDING,
              top: PADDING + CELL_2x2 + GAP,
            },
          ]}
        >
          <WeightCardView
            width={CELL_2x2}
            height={CELL_1x1}
            totalWeight={totalWeight}
            colorIndex={weightColorIndex}
            isEditMode={isEditMode}
            isCapturing={isCapturing}
            onColorChange={onWeightColorChange}
          />
        </View>
        <View
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING + CELL_2x2 + GAP,
            },
          ]}
        >
          <ChartCardView
            width={CELL_2x2}
            height={CELL_2x2}
            categories={categories}
            totalWeightNum={totalWeightNum}
          />
        </View>

        {/* Row 4-5: 왼쪽 하단 카드들 (Gear 5,6) - 동적 */}
        {renderLeftBottomCards()}

        {/* Row 5: Logo (2x1) - Right Side */}
        <View
          style={[
            styles.cardWrapper,
            {
              left: PADDING + CELL_2x2 + GAP,
              top: PADDING + CELL_2x2 + GAP + CELL_2x2 + GAP,
            },
          ]}
        >
          <LogoCardView
            width={CELL_2x2}
            height={CELL_1x1}
            customBackgroundUri={customBackgroundUri}
            isLightBackground={isLightBackground}
            isEditMode={isEditMode}
            isCapturing={isCapturing}
            onBackgroundChange={onBackgroundChange}
          />
        </View>
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
  },
  cardWrapper: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});

export default ShareImageCanvasView;
