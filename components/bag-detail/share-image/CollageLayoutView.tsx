import React, { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';

import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import CollageCanvasView from './CollageCanvasView';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

interface Props {
  viewShotRef: React.RefObject<ViewShot | null>;
  selectedGears: (Gear | null)[];
  categories: Array<{
    category: WarehouseFilter;
    gears: Gear[];
  }>;
  totalWeight: string;
  bagName: string;
  isEditMode: boolean;
  isCapturing: boolean;
  displayScale: number;
  collageKey: number;
  customBackgroundUri: string | null;
  showGearNames: boolean;
  onCollageRefresh: () => void;
  onBackgroundChange: (uri: string | null) => void;
  onToggleGearNames: () => void;
  onLoadingChange?: (isLoading: boolean) => void;
}

const CollageLayoutView: FC<Props> = ({
  viewShotRef,
  selectedGears,
  categories,
  totalWeight,
  bagName,
  isEditMode,
  isCapturing,
  displayScale,
  collageKey,
  customBackgroundUri,
  showGearNames,
  onCollageRefresh,
  onBackgroundChange,
  onToggleGearNames,
  onLoadingChange,
}) => {
  const handleBackgroundChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      onBackgroundChange(uri);
    }
  };

  const handleBackgroundDelete = () => {
    onBackgroundChange(null);
  };

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
              <CollageCanvasView
                key={collageKey}
                selectedGears={selectedGears}
                categories={categories}
                totalWeight={totalWeight}
                bagName={bagName}
                isCapturing={isCapturing}
                isEditMode={isEditMode}
                backgroundImageUri={customBackgroundUri}
                showGearNames={showGearNames}
                {...(onLoadingChange && { onLoadingChange })}
              />
            </ViewShot>
          </View>
        </View>
      </View>

      {isEditMode && (
        <>
          <View style={styles.collageButtonContainer}>
            <TouchableOpacity
              style={styles.collageButton}
              onPress={onCollageRefresh}
              activeOpacity={0.7}
            >
              <Ionicons name='refresh-outline' size={28} color='#000000' />
              <Text style={styles.collageButtonText}>장비 재배치</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.collageButton}
              onPress={handleBackgroundChange}
              activeOpacity={0.7}
            >
              <Ionicons name='image-outline' size={28} color='#000000' />
              <Text style={styles.collageButtonText}>배경 변경</Text>
            </TouchableOpacity>

            {customBackgroundUri && (
              <TouchableOpacity
                style={styles.collageButton}
                onPress={handleBackgroundDelete}
                activeOpacity={0.7}
              >
                <Ionicons name='trash-outline' size={28} color='#000000' />
                <Text style={styles.collageButtonText}>배경 삭제</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.collageButton}
              onPress={onToggleGearNames}
              activeOpacity={0.7}
            >
              <View style={styles.iconWithBadge}>
                <Ionicons name='pricetag-outline' size={28} color='#000000' />
                {showGearNames && (
                  <View style={styles.badge}>
                    <Ionicons name='checkmark' size={12} color='#FFFFFF' />
                  </View>
                )}
              </View>
              <Text style={styles.collageButtonText}>장비 이름</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.guideContainer}>
            <View style={styles.infoTextContainer}>
              <Ionicons name='move-outline' size={16} color='#666666' />
              <Text style={styles.infoText}>
                장비를 드래그하여 위치를 조정할 수 있습니다.
              </Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Ionicons name='resize-outline' size={16} color='#666666' />
              <Text style={styles.infoText}>
                두 손가락으로 핀치하여 크기를 조정할 수 있습니다.
              </Text>
            </View>
            <View style={styles.infoTextContainer}>
              <Ionicons name='close-circle' size={16} color='#666666' />
              <Text style={styles.infoText}>
                우측 상단 × 버튼을 눌러 장비를 삭제할 수 있습니다.
              </Text>
            </View>
          </View>
        </>
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
  collageButtonContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    padding: 0,
    gap: 8,
    justifyContent: 'space-around',
  },
  collageButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 8,
  },
  collageButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  iconWithBadge: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
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

export default CollageLayoutView;
