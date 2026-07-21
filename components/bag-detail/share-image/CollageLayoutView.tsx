import React, { FC } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { ViewShotRef } from 'react-native-view-shot';
import * as ImagePicker from 'expo-image-picker';

import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import CollageCanvasView from './CollageCanvasView';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants';

interface Props {
  viewShotRef: React.RefObject<ViewShotRef | null>;
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const isCompact = screenHeight < 750 || screenWidth < 375;
  const iconSize = isCompact ? 20 : 24;

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
              style={[
                styles.collageButton,
                isCompact && styles.collageButtonCompact,
              ]}
              onPress={onCollageRefresh}
              activeOpacity={0.7}
            >
              <Ionicons
                name='refresh-outline'
                size={iconSize}
                color='#000000'
              />
              <Text
                style={[
                  styles.collageButtonText,
                  isCompact && styles.collageButtonTextCompact,
                ]}
              >
                새로 고침
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.collageButton,
                isCompact && styles.collageButtonCompact,
              ]}
              onPress={handleBackgroundChange}
              activeOpacity={0.7}
            >
              <Ionicons name='image-outline' size={iconSize} color='#000000' />
              <Text
                style={[
                  styles.collageButtonText,
                  isCompact && styles.collageButtonTextCompact,
                ]}
              >
                배경 변경
              </Text>
            </TouchableOpacity>

            {customBackgroundUri && (
              <TouchableOpacity
                style={[
                  styles.collageButton,
                  isCompact && styles.collageButtonCompact,
                ]}
                onPress={handleBackgroundDelete}
                activeOpacity={0.7}
              >
                <Ionicons
                  name='trash-outline'
                  size={iconSize}
                  color='#000000'
                />
                <Text
                  style={[
                    styles.collageButtonText,
                    isCompact && styles.collageButtonTextCompact,
                  ]}
                >
                  배경 삭제
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.collageButton,
                isCompact && styles.collageButtonCompact,
              ]}
              onPress={onToggleGearNames}
              activeOpacity={0.7}
            >
              <View style={styles.iconWithBadge}>
                <Ionicons
                  name='pricetag-outline'
                  size={iconSize}
                  color='#000000'
                />
                {showGearNames && (
                  <View style={styles.badge}>
                    <Ionicons name='checkmark' size={12} color='#FFFFFF' />
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.collageButtonText,
                  isCompact && styles.collageButtonTextCompact,
                ]}
              >
                장비 이름
              </Text>
            </TouchableOpacity>
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
    flexWrap: 'wrap',
    backgroundColor: 'white',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    overflow: 'hidden',
    padding: 0,
    gap: 6,
    justifyContent: 'space-around',
  },
  collageButton: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '22%',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
    gap: 4,
    minHeight: 56,
  },
  collageButtonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    gap: 3,
    minHeight: 48,
  },
  collageButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#000000',
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },
  collageButtonTextCompact: {
    fontSize: 11,
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
});

export default CollageLayoutView;
