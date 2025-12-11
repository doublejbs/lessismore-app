import React, { FC } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

const LOGO_IMG = require('@/assets/images/logo.png');
const MOUNTAIN_IMG = require('@/assets/images/mountain.png');

interface Props {
  width: number;
  height: number;
  customBackgroundUri: string | null;
  isLightBackground: boolean;
  isEditMode: boolean;
  isCapturing: boolean;
  onBackgroundChange: (uri: string, isLight: boolean) => void;
}

const LogoCardView: FC<Props> = ({
  width,
  height,
  customBackgroundUri,
  isLightBackground,
  isEditMode,
  isCapturing,
  onBackgroundChange,
}) => {
  const logoSize = width * 0.7;
  const textColor = isLightBackground ? '#000000' : '#FFFFFF';
  const backgroundSource = customBackgroundUri
    ? { uri: customBackgroundUri }
    : MOUNTAIN_IMG;

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
      const uri = result.assets[0].uri;

      Alert.alert('배경 밝기 선택', '배경 이미지가 밝은 이미지인가요?', [
        {
          text: '어두운 배경',
          onPress: () => onBackgroundChange(uri, false),
        },
        {
          text: '밝은 배경',
          onPress: () => onBackgroundChange(uri, true),
        },
      ]);
    }
  };

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
          borderWidth: isEditMode && !isCapturing ? 2 : 0,
          borderColor: 'rgba(175, 252, 65, 0.4)',
        },
      ]}
      onPress={handleChangeBackground}
      activeOpacity={0.8}
      disabled={!isEditMode}
    >
      <Image
        source={backgroundSource}
        style={StyleSheet.absoluteFill}
        contentFit='cover'
      />
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
      {isEditMode && !isCapturing && (
        <View style={styles.backgroundChangeIconBadge}>
          <Ionicons name='image-outline' size={48} color='white' />
        </View>
      )}
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

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 30,
    overflow: 'hidden',
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
});

export default LogoCardView;
