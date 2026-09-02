import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { ImagePickerAsset } from 'expo-image-picker';
import CommunityImageError from './CommunityImageError';
import CommunityImagePipelineError from './CommunityImagePipelineError';
import CommunityPendingImage from './CommunityPendingImage';

const createLocalId = (): string => {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
};

const createPickerOptions = (selectionLimit: number): ImagePicker.ImagePickerOptions => {
  return {
    mediaTypes: ['images'],
    allowsMultipleSelection: selectionLimit > 1,
    selectionLimit,
    exif: false,
  };
};

/**
 * 커뮤니티 공개 사진 선택을 담당한다(CM-6, DM-9, DM-28).
 * 선택 결과는 개인 장비 사진 경로와 분리된 커뮤니티 공개 UGC 파이프라인으로만 전달한다.
 */
class CommunityImagePicker {
  public async pickFromAlbum(maxCount: number): Promise<CommunityPendingImage[]> {
    const selectionLimit = Math.max(1, Math.floor(maxCount));

    if (Platform.OS !== 'web') {
      let permissionGranted = false;

      try {
        permissionGranted = await this.requestAlbumPermission();
      } catch (error) {
        throw new CommunityImagePipelineError(
          CommunityImageError.PermissionDenied,
          error
        );
      }

      if (!permissionGranted) {
        throw new CommunityImagePipelineError(
          CommunityImageError.PermissionDenied
        );
      }
    }

    let result: ImagePicker.ImagePickerResult;

    try {
      result = await ImagePicker.launchImageLibraryAsync(
        createPickerOptions(selectionLimit)
      );
    } catch (error) {
      throw new CommunityImagePipelineError(
        CommunityImageError.UnsupportedType,
        error
      );
    }

    if (result.canceled) {
      throw new CommunityImagePipelineError(CommunityImageError.Cancelled);
    }

    if (result.assets.length === 0) {
      throw new CommunityImagePipelineError(CommunityImageError.Cancelled);
    }

    return result.assets.map((asset) => this.createPendingImage(asset));
  }

  public async captureWithCamera(): Promise<CommunityPendingImage> {
    if (!this.isCameraAvailable()) {
      throw new CommunityImagePipelineError(
        CommunityImageError.UnsupportedType
      );
    }

    let permissionResponse: ImagePicker.CameraPermissionResponse;

    try {
      permissionResponse = await ImagePicker.requestCameraPermissionsAsync();
    } catch (error) {
      throw new CommunityImagePipelineError(
        CommunityImageError.PermissionDenied,
        error
      );
    }

    if (!permissionResponse.granted) {
      throw new CommunityImagePipelineError(
        CommunityImageError.PermissionDenied
      );
    }

    let result: ImagePicker.ImagePickerResult;

    try {
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        exif: false,
      });
    } catch (error) {
      throw new CommunityImagePipelineError(
        CommunityImageError.UnsupportedType,
        error
      );
    }

    if (result.canceled || result.assets.length === 0) {
      throw new CommunityImagePipelineError(CommunityImageError.Cancelled);
    }

    return this.createPendingImage(result.assets[0]);
  }

  public isCameraAvailable(): boolean {
    return Platform.OS === 'ios' || Platform.OS === 'android';
  }

  private async requestAlbumPermission(): Promise<boolean> {
    if (Platform.OS === 'android') {
      // Android 시스템 Photo Picker는 선택한 항목만 앱에 전달하므로 영구 권한을 요청하지 않는다.
      return true;
    }

    const response = await ImagePicker.requestMediaLibraryPermissionsAsync();

    // iOS 제한된 사진 접근은 사용자가 선택한 사진에 대한 유효한 허용이다.
    return response.granted || response.accessPrivileges === 'limited';
  }

  private createPendingImage(asset: ImagePickerAsset): CommunityPendingImage {
    if (asset.type && asset.type !== 'image') {
      throw new CommunityImagePipelineError(
        CommunityImageError.UnsupportedType
      );
    }

    return new CommunityPendingImage(
      createLocalId(),
      asset.uri,
      asset.width,
      asset.height
    );
  }
}

export default CommunityImagePicker;
