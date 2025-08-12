import React, { FC } from 'react';
import { View, TouchableOpacity, Image, Text, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import FileUpload from '@/model/gear/FileUpload';
import { observer } from 'mobx-react-lite';

interface Props {
  fileUpload: FileUpload;
}

const ImageUploadView: FC<Props> = ({ fileUpload }) => {
  const previewSrc = fileUpload.getPreviewSrc();
  const hasPreviewSrc = fileUpload.hasPreviewSrc();

  // 이미지 선택 핸들러
  const handleImagePicker = async () => {
    try {
      // 권한 요청
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '이미지를 선택하려면 갤러리 접근 권한이 필요합니다.'
        );
        return;
      }

      // 이미지 선택
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        // 파일 확장자를 기반으로 올바른 MIME 타입 설정
        const fileName = asset.fileName || 'image.jpg';
        const getImageMimeType = (filename: string): string => {
          const ext = filename.toLowerCase().split('.').pop();
          switch (ext) {
            case 'jpg':
            case 'jpeg':
              return 'image/jpeg';
            case 'png':
              return 'image/png';
            case 'gif':
              return 'image/gif';
            case 'webp':
              return 'image/webp';
            default:
              return 'image/jpeg';
          }
        };

        // React Native에서 사용하는 이미지 파일 객체
        const file = {
          uri: asset.uri,
          name: fileName,
          type: getImageMimeType(fileName),
        };

        fileUpload.setFile(file);
        fileUpload.setPreviewSrc(asset.uri);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  const handleDeletePreview = () => {
    fileUpload.setPreviewSrc('');
    fileUpload.setFile(null as any);
  };

  return (
    <View
      style={{
        height: '100%',
        flexDirection: 'row',
        gap: 8,
      }}
    >
      <TouchableOpacity
        onPress={handleImagePicker}
        style={{
          borderWidth: 1,
          borderColor: '#E7E7E7',
          borderRadius: 4,
          height: 80,
          width: 80,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'white',
        }}
      >
        <Ionicons name='camera' size={24} color='black' />
      </TouchableOpacity>

      {hasPreviewSrc && (
        <View
          style={{
            width: 80,
            height: 80,
            position: 'relative',
            justifyContent: 'center',
            backgroundColor: '#F6F6F6',
            borderRadius: 4,
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              borderWidth: 1,
              borderColor: 'black',
              borderRadius: 8,
              backgroundColor: 'black',
              width: 16,
              height: 16,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}
            onPress={handleDeletePreview}
          >
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              ×
            </Text>
          </TouchableOpacity>
          <Image
            source={{ uri: previewSrc }}
            style={{
              width: 80,
              height: 80,
              borderRadius: 4,
            }}
            resizeMode='cover'
          />
        </View>
      )}
    </View>
  );
};

export default observer(ImageUploadView);
