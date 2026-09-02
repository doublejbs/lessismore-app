import { makeAutoObservable } from 'mobx';
import CommunityImageError from './CommunityImageError';
import CommunityImageUploadState from './CommunityImageUploadState';
import CommunityUploadedImage from './CommunityUploadedImage';

/**
 * 선택부터 업로드까지 커뮤니티 사진 한 장의 상태다(CM-6, DM-9, DM-28).
 * 이 로컬 모델은 개인 장비 사진 모델·경로와 분리되어 공개 UGC만 표현한다.
 */
class CommunityPendingImage {
  public readonly localId: string;
  public sourceUri: string;
  public width: number;
  public height: number;
  public state: CommunityImageUploadState = CommunityImageUploadState.Pending;
  public error?: CommunityImageError;
  public uploaded?: CommunityUploadedImage;

  public constructor(
    localId: string,
    sourceUri: string,
    width: number,
    height: number
  ) {
    this.localId = localId;
    this.sourceUri = sourceUri;
    this.width = width;
    this.height = height;

    makeAutoObservable(this);
  }

  public markUploading() {
    this.state = CommunityImageUploadState.Uploading;
    delete this.error;
  }

  public markDone(uploaded: CommunityUploadedImage) {
    this.uploaded = uploaded;
    this.state = CommunityImageUploadState.Done;
    delete this.error;
  }

  public markFailed(error: CommunityImageError) {
    this.state = CommunityImageUploadState.Failed;
    this.error = error;
  }

  public resetForRetry() {
    this.state = CommunityImageUploadState.Pending;
    delete this.error;
  }

  public clearUploaded() {
    delete this.uploaded;
    this.state = CommunityImageUploadState.Pending;
    delete this.error;
  }
}

export default CommunityPendingImage;
