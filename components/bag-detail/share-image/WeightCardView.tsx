import { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { WEIGHT_GRADIENTS } from './constants';

interface Props {
  width: number;
  height: number;
  totalWeight: string;
  colorIndex: number;
  isEditMode: boolean;
  isCapturing: boolean;
  onColorChange: () => void;
}

const WeightCardView: FC<Props> = ({
  width,
  height,
  totalWeight,
  colorIndex,
  isEditMode,
  isCapturing,
  onColorChange,
}) => {
  const currentGradient = WEIGHT_GRADIENTS[colorIndex];

  return (
    <TouchableOpacity
      onPress={onColorChange}
      activeOpacity={0.8}
      style={{ width, height }}
      disabled={!isEditMode}
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
        {isEditMode && !isCapturing && (
          <View style={styles.weightColorIconBadge}>
            <Ionicons name='refresh-outline' size={49} color='white' />
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

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 30,
    overflow: 'hidden',
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
  totalWeightText: {
    fontSize: 80,
    fontWeight: '700',
  },
});

export default WeightCardView;
