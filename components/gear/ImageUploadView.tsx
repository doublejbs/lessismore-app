import React, { FC } from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActionSheetIOS,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import FileUpload from '@/model/gear/FileUpload';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  fileUpload: FileUpload;
}

const ImageUploadView: FC<Props> = ({ fileUpload }) => {
  const previewSrc = fileUpload.getPreviewSrc();
  const hasPreviewSrc = fileUpload.hasPreviewSrc();

  // 이미지 처리 공통 함수
  const processImageResult = (asset: ImagePicker.ImagePickerAsset) => {
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
  };

  // 카메라 촬영 핸들러
  const handleCamera = async () => {
    try {
      // 카메라 권한 요청
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '사진을 촬영하려면 카메라 접근 권한이 필요합니다.'
        );
        return;
      }

      // 카메라 촬영
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        processImageResult(result.assets[0]);
      }
    } catch (error) {
      console.error('카메라 촬영 오류:', error);
      Alert.alert('오류', '사진을 촬영하는 중 오류가 발생했습니다.');
    }
  };

  // 갤러리 선택 핸들러 (iOS에서는 카메라 옵션 포함)
  const handleGallery = async () => {
    try {
      // 갤러리 및 카메라 권한 요청
      const [mediaLibraryStatus, cameraStatus] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync(),
      ]);

      if (mediaLibraryStatus.status !== 'granted') {
        Alert.alert(
          '권한 필요',
          '이미지를 선택하려면 갤러리 접근 권한이 필요합니다.'
        );
        return;
      }

      // iOS에서는 카메라 옵션도 포함된 갤러리 선택
      // allowsEditing과 cameraType 등 추가 옵션 설정
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        // iOS에서 갤러리 내 카메라 옵션 활성화
        allowsMultipleSelection: false,
        selectionLimit: 1,
      });

      if (!result.canceled && result.assets[0]) {
        processImageResult(result.assets[0]);
      }
    } catch (error) {
      console.error('이미지 선택 오류:', error);
      Alert.alert('오류', '이미지를 선택하는 중 오류가 발생했습니다.');
    }
  };

  // 이미지 선택 옵션 표시
  const handleImagePicker = () => {
    if (Platform.OS === 'ios') {
      // iOS 네이티브 액션 시트 사용
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['취소', '사진 촬영', '사진 보관함에서 선택'],
          cancelButtonIndex: 0,
          title: '사진 추가',
        },
        buttonIndex => {
          switch (buttonIndex) {
            case 1:
              handleCamera();
              break;
            case 2:
              handleGallery();
              break;
            default:
              // 취소
              break;
          }
        }
      );
    } else {
      // Android에서는 Alert 다이얼로그 사용
      Alert.alert(
        '사진 선택',
        '어떤 방법으로 사진을 추가하시겠습니까?',
        [
          {
            text: '취소',
            style: 'cancel',
          },
          {
            text: '사진 촬영',
            onPress: handleCamera,
          },
          {
            text: '갤러리에서 선택',
            onPress: handleGallery,
          },
        ],
        { cancelable: true }
      );
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
          borderColor: Color.borderLight,
          borderRadius: Radius.listThumb,
          height: 80,
          width: 80,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: Color.background,
        }}
      >
        <Ionicons name='camera' size={24} color={Color.textPrimary} />
      </TouchableOpacity>

      {hasPreviewSrc && (
        <View
          style={{
            width: 80,
            height: 80,
            position: 'relative',
            justifyContent: 'center',
            backgroundColor: Color.inputBg,
            borderRadius: Radius.listThumb,
          }}
        >
          <TouchableOpacity
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              borderWidth: 1,
              borderColor: Color.textPrimary,
              borderRadius: 8,
              backgroundColor: Color.textPrimary,
              width: 16,
              height: 16,
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1,
            }}
            onPress={handleDeletePreview}
          >
            <PretendardText
              weight='bold'
              style={{ color: Color.background, fontSize: 10 }}
            >
              ×
            </PretendardText>
          </TouchableOpacity>
          <Image
            source={{ uri: previewSrc }}
            style={{
              width: 80,
              height: 80,
              borderRadius: Radius.listThumb,
            }}
            resizeMode='cover'
          />
        </View>
      )}
    </View>
  );
};

export default observer(ImageUploadView);
