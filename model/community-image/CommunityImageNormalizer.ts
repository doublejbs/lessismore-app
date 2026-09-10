import { Platform } from 'react-native';
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  COMMUNITY_IMAGE_MAX_BYTES,
  COMMUNITY_IMAGE_MAX_DIMENSION,
} from '@/model/community/CommunityLimits';
import CommunityImageError from './CommunityImageError';
import CommunityImagePipelineError from './CommunityImagePipelineError';

const COMPRESS_LEVELS = [0.9, 0.8, 0.7, 0.6, 0.5];

export interface CommunityNormalizedImage {
  uri: string;
  width: number;
  height: number;
  byteLength: number;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const getTargetDimensions = (width: number, height: number): ImageDimensions => {
  const safeWidth = width > 0 ? width : COMMUNITY_IMAGE_MAX_DIMENSION;
  const safeHeight = height > 0 ? height : COMMUNITY_IMAGE_MAX_DIMENSION;
  const longestSide = Math.max(safeWidth, safeHeight);

  if (longestSide <= COMMUNITY_IMAGE_MAX_DIMENSION) {
    return {
      width: safeWidth,
      height: safeHeight,
    };
  }

  const ratio = COMMUNITY_IMAGE_MAX_DIMENSION / longestSide;

  return {
    width: Math.max(1, Math.round(safeWidth * ratio)),
    height: Math.max(1, Math.round(safeHeight * ratio)),
  };
};

const getErrorCode = (error: unknown): CommunityImageError | undefined => {
  if (error instanceof CommunityImagePipelineError) {
    return error.code;
  }

  return undefined;
};

/**
 * 커뮤니티 공개 사진을 JPEG로 정규화한다(CM-6, DM-9, DM-28).
 * 재인코딩 결과는 EXIF를 보존하지 않으며 개인 장비 사진 경로와 분리된 공개 UGC만 반환한다.
 */
class CommunityImageNormalizer {
  public async normalize(
    uri: string,
    width: number,
    height: number
  ): Promise<CommunityNormalizedImage> {
    const target = getTargetDimensions(width, height);

    try {
      return await this.normalizeWithManipulator(uri, target);
    } catch (error) {
      if (
        Platform.OS !== 'web' ||
        getErrorCode(error) === CommunityImageError.TooLarge
      ) {
        throw error;
      }

      return await this.normalizeWithCanvas(uri, target);
    }
  }

  private async normalizeWithManipulator(
    uri: string,
    target: ImageDimensions
  ): Promise<CommunityNormalizedImage> {
    let previousUri: string | undefined;

    try {
      const context = ImageManipulator.manipulate(uri);
      const rendered = await context
        .resize({ width: target.width, height: target.height })
        .renderAsync();

      for (const compress of COMPRESS_LEVELS) {
        const result = await rendered.saveAsync({
          // 디코드·렌더 단계에서 EXIF 방향을 적용하고, JPEG 재인코딩은 원본 EXIF·GPS 메타데이터를 복사하지 않는다.
          format: SaveFormat.JPEG,
          compress,
        });
        const byteLength = await this.measureByteLength(result.uri);

        await this.removeIntermediate(previousUri);
        previousUri = result.uri;

        if (byteLength <= COMMUNITY_IMAGE_MAX_BYTES) {
          return {
            uri: result.uri,
            width: result.width,
            height: result.height,
            byteLength,
          };
        }
      }

      await this.removeIntermediate(previousUri);
      throw new CommunityImagePipelineError(CommunityImageError.TooLarge);
    } catch (error) {
      console.error('커뮤니티 사진 정규화 실패:', error); // l10n-ignore: 개발자 로그

      if (error instanceof CommunityImagePipelineError) {
        throw error;
      }

      throw new CommunityImagePipelineError(
        CommunityImageError.NormalizeFailed,
        error
      );
    }
  }

  private removeIntermediate(uri: string | undefined): void {
    if (!uri) {
      return;
    }

    this.revokeWebUri(uri);

    if (Platform.OS !== 'web') {
      try {
        new File(uri).delete();
      } catch {
        // Temporary cache cleanup is best effort.
      }
    }
  }

  private async normalizeWithCanvas(
    uri: string,
    target: ImageDimensions
  ): Promise<CommunityNormalizedImage> {
    if (Platform.OS !== 'web') {
      throw new CommunityImagePipelineError(
        CommunityImageError.NormalizeFailed
      );
    }

    try {
      const image = await this.loadWebImage(uri);
      const canvas = document.createElement('canvas');
      canvas.width = target.width;
      canvas.height = target.height;
      const context = canvas.getContext('2d');

      if (!context) {
        throw new Error('Canvas context unavailable');
      }

      context.drawImage(image, 0, 0, target.width, target.height);

      for (const compress of COMPRESS_LEVELS) {
        const blob = await this.createJpegBlob(canvas, compress);
        const resultUri = URL.createObjectURL(blob);

        if (blob.size <= COMMUNITY_IMAGE_MAX_BYTES) {
          return {
            uri: resultUri,
            width: target.width,
            height: target.height,
            byteLength: blob.size,
          };
        }

        URL.revokeObjectURL(resultUri);
      }

      throw new CommunityImagePipelineError(CommunityImageError.TooLarge);
    } catch (error) {
      console.error('커뮤니티 사진 정규화 실패:', error); // l10n-ignore: 개발자 로그

      if (error instanceof CommunityImagePipelineError) {
        throw error;
      }

      throw new CommunityImagePipelineError(
        CommunityImageError.NormalizeFailed,
        error
      );
    }
  }

  private async measureByteLength(uri: string): Promise<number> {
    if (Platform.OS === 'web') {
      const response = await fetch(uri);

      return (await response.blob()).size;
    }

    try {
      const file = new File(uri);

      if (file.size > 0) {
        return file.size;
      }
    } catch {
      // 일부 ph://·content:// URI는 expo-file-system File로 열 수 없어 fetch로 폴백한다.
    }

    const response = await fetch(uri);

    return (await response.blob()).size;
  }

  private async loadWebImage(uri: string): Promise<HTMLImageElement> {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image loading failed'));
      image.src = uri;
    });
  }

  private async createJpegBlob(
    canvas: HTMLCanvasElement,
    compress: number
  ): Promise<Blob> {
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);

          return;
        }

        reject(new Error('JPEG encoding failed'));
      }, 'image/jpeg', compress);
    });
  }

  private revokeWebUri(uri: string | undefined) {
    if (Platform.OS === 'web' && uri?.startsWith('blob:')) {
      URL.revokeObjectURL(uri);
    }
  }
}

export default CommunityImageNormalizer;
