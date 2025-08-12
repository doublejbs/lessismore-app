import FirebaseImageStorage from '@/model/firebase/FirebaseImageStorage';
import { action, makeObservable, observable } from 'mobx';

// Simple UUID generator for React Native
const generateUUID = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// React Native에서 사용하는 이미지 파일 타입
interface ImageFile {
  uri: string;
  name: string;
  type: string;
}

abstract class FileUpload {
  protected constructor() {
    makeObservable(this);
  }

  @observable private previewSrc: string = '';
  @observable private imageFile: ImageFile | File | null = null;
  private readonly imageStorage = FirebaseImageStorage.new();

  protected abstract getFileName(): string;

  @action
  public setPreviewSrc(src: string): void {
    this.previewSrc = src;
  }

  public getPreviewSrc(): string {
    return this.previewSrc;
  }

  public hasPreviewSrc(): boolean {
    return !!this.previewSrc && String(this.previewSrc) !== 'true';
  }

  @action
  public setFile(file: ImageFile | File): void {
    this.imageFile = file;
  }

  @action
  protected clearFile(): void {
    this.imageFile = null;
  }

  protected getFile() {
    return this.imageFile;
  }

  protected async getFileUrl() {
    if (this.imageFile) {
      return await this.imageStorage.uploadFile(this.imageFile, generateUUID());
    } else {
      return '';
    }
  }
}

export default FileUpload;
