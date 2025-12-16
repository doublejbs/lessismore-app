import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import Gear from '@/model/gear/Gear';
import { BG_COLOR, CARD_BG_COLOR } from './constants';

interface Props {
  gear: Gear | null;
  width: number;
  height: number;
  slotIndex: number;
  showResizeButton: boolean;
  isCapturing: boolean;
  onSlotClick: (index: number) => void;
  onRemoveGear: (index: number) => void;
  onCardSizeChange: (index: number) => void;
}

const GearCardView: FC<Props> = ({
  gear,
  width,
  height,
  slotIndex,
  showResizeButton,
  isCapturing,
  onSlotClick,
  onRemoveGear,
  onCardSizeChange,
}) => {
  const canResize = [1, 2, 3, 4, 5, 6].includes(slotIndex);
  const isClickable = true;

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
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
      onPress={() => showResizeButton && onSlotClick(slotIndex)}
      onLongPress={() => showResizeButton && gear && onRemoveGear(slotIndex)}
      activeOpacity={0.7}
      disabled={!showResizeButton}
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
              <Ionicons name='image-outline' size={48} color='white' />
            </View>
          )}
          {canResize && showResizeButton && (
            <TouchableOpacity
              style={styles.resizeButton}
              onPress={e => {
                e.stopPropagation();
                onCardSizeChange(slotIndex);
              }}
            >
              <Ionicons name='expand-outline' size={60} color='white' />
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

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 30,
    overflow: 'hidden',
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
  clickHintText: {
    position: 'absolute',
    bottom: 16,
    fontSize: 12,
    color: '#999999',
    fontFamily: 'Inter_400Regular',
  },
});

export default GearCardView;
