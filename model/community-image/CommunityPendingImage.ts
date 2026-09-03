import { makeAutoObservable } from 'mobx';
import CommunityImageError from './CommunityImageError';
import CommunityImageUploadState from './CommunityImageUploadState';
import { CommunityPostImage } from '@/model/community/CommunityData';

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
  public progress = 0;
  public error: CommunityImageError | undefined = undefined;
  public uploaded: CommunityPostImage | undefined = undefined;

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
    this.setState(CommunityImageUploadState.Uploading);
    this.setProgress(0);
    this.clearError();
  }

  public markDone(uploaded: CommunityPostImage) {
    this.setUploaded(uploaded);
    this.setState(CommunityImageUploadState.Done);
    this.setProgress(1);
    this.clearError();
  }

  public markFailed(error: CommunityImageError) {
    this.setState(CommunityImageUploadState.Failed);
    this.setError(error);
  }

  public resetForRetry() {
    this.setState(CommunityImageUploadState.Pending);
    this.clearError();
  }

  public clearUploaded() {
    this.clearUploadedValue();
    this.setState(CommunityImageUploadState.Pending);
    this.clearError();
  }

  public setSourceUri(value: string) {
    this.sourceUri = value;
  }

  public setDimensions(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  public setProgress(value: number) {
    this.progress = Math.min(1, Math.max(0, value));
  }

  private setState(value: CommunityImageUploadState) {
    this.state = value;
  }

  private setError(value: CommunityImageError) {
    this.error = value;
  }

  private clearError() {
    this.error = undefined;
  }

  private setUploaded(value: CommunityPostImage) {
    this.uploaded = value;
  }

  private clearUploadedValue() {
    this.uploaded = undefined;
  }
}

export default CommunityPendingImage;
