import { makeAutoObservable } from 'mobx';
import GearImageType from '../gear/GearImageType';
import GearImageStore from '../store/GearImageStore';
import app from '../app/App';

class GearImageSelection {
  public static new(gearId: string, isCustom: boolean) {
    return new GearImageSelection(gearId, isCustom, app.getGearImageStore()!);
  }

  private images: GearImageType[] = [];
  private loading = false;
  private modalVisible = false;

  private constructor(
    private readonly gearId: string,
    private readonly isCustom: boolean,
    private readonly gearImageStore: GearImageStore
  ) {
    makeAutoObservable(this);
  }

  public async loadImages(): Promise<void> {
    if (this.isCustom) return;

    this.setLoading(true);
    try {
      const images = await this.gearImageStore.getImages(this.gearId);

      this.setImages(images);
    } finally {
      this.setLoading(false);
    }
  }

  public showModal(): void {
    if (!this.isCustom) {
      this.setModalVisible(true);
    }
  }

  public hideModal(): void {
    this.setModalVisible(false);
  }

  public canShowSharedImages(): boolean {
    return !this.isCustom;
  }

  public getGearId(): string {
    return this.gearId;
  }

  private setImages(value: GearImageType[]) {
    this.images = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setModalVisible(value: boolean) {
    this.modalVisible = value;
  }

  public getImages() {
    return this.images;
  }

  public isLoading() {
    return this.loading;
  }

  public isModalVisible() {
    return this.modalVisible;
  }

  public hasImages() {
    return this.images.length > 0;
  }

  public getImageCount() {
    return this.images.length;
  }
}

export default GearImageSelection;
