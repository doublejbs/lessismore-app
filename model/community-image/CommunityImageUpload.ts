import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import type Firebase from '@/model/firebase/Firebase';
import { createCommunityId } from '@/model/community/CommunityId';
import { CommunityPostImage } from '@/model/community/CommunityData';
import CommunityImageDeleteFailure from './CommunityImageDeleteFailure';
import CommunityImageError from './CommunityImageError';
import CommunityImageOwnership from './CommunityImageOwnership';
import CommunityImagePipelineError from './CommunityImagePipelineError';
import CommunityPendingImage from './CommunityPendingImage';

const OBJECT_NOT_FOUND_CODE = 'storage/object-not-found';
const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';

/**
 * 커뮤니티 공개 사진을 Storage에 올리고 정리한다(CM-6, DM-9, DM-28).
 * 저장 경로는 `community/` 전용이며 개인 장비 사진 경로와 절대 섞지 않는다.
 */
class CommunityImageUpload {
  private readonly firebase: Firebase;

  public constructor(firebase: Firebase) {
    this.firebase = firebase;
  }

  public static from(firebase: Firebase): CommunityImageUpload {
    return new CommunityImageUpload(firebase);
  }

  public async upload(
    userId: string,
    postId: string,
    image: CommunityPendingImage,
    onProgress?: (progress: number) => void
  ): Promise<CommunityPostImage> {
    if (!userId) {
      throw new CommunityImagePipelineError(CommunityImageError.NotLoggedIn);
    }

    if (!postId) {
      throw new CommunityImagePipelineError(
        CommunityImageError.UploadFailed,
        new Error('Post ID is required')
      );
    }

    const imageId = createCommunityId();
    const storagePath = `community/${userId}/${postId}/${imageId}.jpg`;

    const storageRef = ref(this.firebase.getStorage(), storagePath);

    try {
      if (onProgress) {
        onProgress(0);
      }

      const blob = await this.fetchBlob(image.sourceUri);
      const metadata = {
        contentType: DEFAULT_IMAGE_CONTENT_TYPE,
      };

      await uploadBytes(storageRef, blob, metadata);

      if (onProgress) {
        onProgress(1);
      }
    } catch (error) {
      console.error('커뮤니티 사진 업로드 실패:', error); // l10n-ignore: 개발자 로그

      if (error instanceof CommunityImagePipelineError) {
        throw error;
      }

      throw new CommunityImagePipelineError(
        CommunityImageError.UploadFailed,
        error
      );
    }

    let url: string;

    try {
      url = await getDownloadURL(storageRef);
    } catch (error) {
      console.error('커뮤니티 사진 URL 조회 실패:', error); // l10n-ignore: 개발자 로그

      throw new CommunityImagePipelineError(
        CommunityImageError.UploadFailed,
        error
      );
    }

    return {
      id: imageId,
      url,
      storagePath,
      width: image.width,
      height: image.height,
    };
  }

  public async delete(storagePath: string, userId: string): Promise<void> {
    if (!CommunityImageOwnership.isOwnedPath(storagePath, userId)) {
      return;
    }

    try {
      await deleteObject(ref(this.firebase.getStorage(), storagePath));
    } catch (error) {
      if ((error as { code?: string }).code === OBJECT_NOT_FOUND_CODE) {
        return;
      }

      throw error;
    }
  }

  public async deleteMany(
    storagePaths: string[],
    userId: string
  ): Promise<CommunityImageDeleteFailure[]> {
    const failures: CommunityImageDeleteFailure[] = [];

    for (const storagePath of storagePaths) {
      try {
        await this.delete(storagePath, userId);
      } catch (error) {
        failures.push({ storagePath, error });
      }
    }

    return failures;
  }

  private async fetchBlob(localUri: string): Promise<Blob> {
    const response = await fetch(localUri);

    if (!response.ok && response.status !== 0) {
      throw new Error(`Image fetch failed with status ${response.status}`);
    }

    const blob = await response.blob();

    if (blob.size === 0) {
      throw new Error('Image file is empty');
    }

    return blob;
  }
}

export default CommunityImageUpload;
