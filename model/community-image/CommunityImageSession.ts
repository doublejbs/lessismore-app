import { makeAutoObservable } from 'mobx';
import type Firebase from '@/model/firebase/Firebase';
import CommunityImageDeleteFailure from './CommunityImageDeleteFailure';
import CommunityImageError from './CommunityImageError';
import CommunityImageNormalizer from './CommunityImageNormalizer';
import CommunityImagePipelineError from './CommunityImagePipelineError';
import CommunityImageUpload from './CommunityImageUpload';
import CommunityImageUploadState from './CommunityImageUploadState';
import CommunityPendingImage from './CommunityPendingImage';
import CommunityUploadedImage from './CommunityUploadedImage';

const MAX_IMAGE_COUNT = 4;

/**
 * 커뮤니티 작성 사진의 선택·정규화·업로드 생명주기를 관리한다(CM-6, DM-9, DM-28).
 * 세션이 다루는 공개 사진은 개인 장비 사진 경로와 분리해 취소·실패 정리까지 수행한다.
 */
class CommunityImageSession {
  public readonly images: CommunityPendingImage[] = [];
  private readonly activeLocalIds = new Set<string>();
  private readonly removedStoragePaths = new Set<string>();
  private readonly imageUpload: CommunityImageUpload;
  private readonly normalizer: CommunityImageNormalizer;
  private uploadUserId = '';
  private uploadPostId = '';

  public constructor(
    imageUpload: CommunityImageUpload,
    normalizer: CommunityImageNormalizer = new CommunityImageNormalizer()
  ) {
    this.imageUpload = imageUpload;
    this.normalizer = normalizer;

    makeAutoObservable(this);
  }

  public static from(firebase: Firebase): CommunityImageSession {
    return new CommunityImageSession(CommunityImageUpload.from(firebase));
  }

  public add(images: CommunityPendingImage[]) {
    if (this.images.length + images.length > MAX_IMAGE_COUNT) {
      throw new CommunityImagePipelineError(
        CommunityImageError.LimitExceeded
      );
    }

    this.setImages([...this.images, ...images]);
  }

  public remove(localId: string) {
    const index = this.images.findIndex((image) => image.localId === localId);

    if (index < 0) {
      return;
    }

    const removedImage = this.images[index];
    this.setImages(this.images.filter((_, itemIndex) => itemIndex !== index));

    if (removedImage.uploaded) {
      this.addRemovedStoragePath(removedImage.uploaded.storagePath);
    }
  }

  public move(from: number, to: number) {
    if (
      from < 0 ||
      from >= this.images.length ||
      to < 0 ||
      to >= this.images.length ||
      from === to
    ) {
      return;
    }

    const nextImages = [...this.images];
    const [image] = nextImages.splice(from, 1);

    nextImages.splice(to, 0, image);
    this.setImages(nextImages);
  }

  public async uploadAll(userId: string, postId: string): Promise<void> {
    const pendingImages = this.images.filter(
      (image) => image.state === CommunityImageUploadState.Pending
    );

    if (pendingImages.length === 0) {
      return;
    }

    if (!userId) {
      throw new CommunityImagePipelineError(CommunityImageError.NotLoggedIn);
    }

    this.setUploadUserId(userId);
    this.setUploadPostId(postId);

    const failures: unknown[] = [];

    for (const image of pendingImages) {
      try {
        await this.uploadOne(userId, postId, image);
      } catch (error) {
        failures.push(error);
      }
    }

    if (failures.length > 0) {
      throw new CommunityImagePipelineError(
        CommunityImageError.UploadFailed,
        failures
      );
    }
  }

  public async retry(localId: string): Promise<void> {
    const image = this.images.find((item) => item.localId === localId);

    if (!image || image.state === CommunityImageUploadState.Done) {
      return;
    }

    if (!this.uploadUserId || !this.uploadPostId) {
      image.markFailed(CommunityImageError.NotLoggedIn);
      throw new CommunityImagePipelineError(CommunityImageError.NotLoggedIn);
    }

    image.resetForRetry();

    await this.uploadOne(this.uploadUserId, this.uploadPostId, image);
  }

  public async cleanupUploaded(
    userId: string
  ): Promise<CommunityImageDeleteFailure[]> {
    if (!userId) {
      throw new CommunityImagePipelineError(CommunityImageError.NotLoggedIn);
    }

    const storagePaths = new Set<string>(this.removedStoragePaths);

    for (const image of this.images) {
      if (image.uploaded) {
        storagePaths.add(image.uploaded.storagePath);
      }
    }

    const failures = await this.imageUpload.deleteMany(
      Array.from(storagePaths),
      userId
    );
    const failurePaths = new Set(
      failures.map((failure) => failure.storagePath)
    );

    for (const image of this.images) {
      if (image.uploaded && !failurePaths.has(image.uploaded.storagePath)) {
        image.clearUploaded();
      }
    }

    for (const storagePath of storagePaths) {
      if (!failurePaths.has(storagePath)) {
        this.deleteRemovedStoragePath(storagePath);
      }
    }

    return failures;
  }

  public getUploadedInOrder(): CommunityUploadedImage[] {
    return this.images.flatMap((image) =>
      image.uploaded ? [image.uploaded] : []
    );
  }

  public hasPending(): boolean {
    return this.images.some(
      (image) => image.state !== CommunityImageUploadState.Done
    );
  }

  public isAllUploaded(): boolean {
    return this.images.every(
      (image) => image.state === CommunityImageUploadState.Done
    );
  }

  private async uploadOne(
    userId: string,
    postId: string,
    image: CommunityPendingImage
  ): Promise<void> {
    if (this.activeLocalIds.has(image.localId)) {
      return;
    }

    this.addActiveLocalId(image.localId);
    image.markUploading();

    try {
      const normalized = await this.normalizer.normalize(
        image.sourceUri,
        image.width,
        image.height
      );
      image.setSourceUri(normalized.uri);
      image.setDimensions(normalized.width, normalized.height);

      const uploaded = await this.imageUpload.upload(userId, postId, image);

      if (!this.images.includes(image)) {
        this.addRemovedStoragePath(uploaded.storagePath);

        return;
      }

      image.markDone(uploaded);
    } catch (error) {
      image.markFailed(this.toImageError(error));
      throw error;
    } finally {
      this.deleteActiveLocalId(image.localId);
    }
  }

  private toImageError(error: unknown): CommunityImageError {
    if (error instanceof CommunityImagePipelineError) {
      return error.code;
    }

    return CommunityImageError.UploadFailed;
  }

  private setUploadUserId(value: string) {
    this.uploadUserId = value;
  }

  private setImages(value: CommunityPendingImage[]) {
    this.images.splice(0, this.images.length, ...value);
  }

  private setUploadPostId(value: string) {
    this.uploadPostId = value;
  }

  private addActiveLocalId(value: string) {
    this.activeLocalIds.add(value);
  }

  private deleteActiveLocalId(value: string) {
    this.activeLocalIds.delete(value);
  }

  private addRemovedStoragePath(value: string) {
    this.removedStoragePaths.add(value);
  }

  private deleteRemovedStoragePath(value: string) {
    this.removedStoragePaths.delete(value);
  }
}

export default CommunityImageSession;
