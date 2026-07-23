import { action, makeObservable, observable } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import AbstractGearEdit from '@/model/gear/AbstractGearEdit';
import CustomGearCategory from '@/model/gear/custom/CustomGearCategory';
import Gear from '@/model/gear/Gear';
import GearEditDispatcher from '@/model/gear/edit/GearEditDispatcher';
import app from '@/model/app/App';
import AlertManager from '@/model/alert/AlertManager';
import ToastManager from '@/model/toast/ToastManager';

class GearEdit extends AbstractGearEdit {
  public static from(
    dispatcher: GearEditDispatcher,
    navigate: ImperativeRouter,
    category: CustomGearCategory
  ) {
    return new GearEdit(
      dispatcher,
      navigate,
      category,
      app.getAlertManager()!,
      app.getToastManager()!
    );
  }

  private gear: Gear | null = null;
  @observable private initialized = false;
  @observable private initialWeight = '';
  private onRegister: (gear: Gear) => Promise<void> = async () => {};

  private constructor(
    private readonly dispatcher: GearEditDispatcher,
    private readonly navigate: ImperativeRouter,
    category: CustomGearCategory,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
  ) {
    super(category, '', '', '', '');
    makeObservable(this);
  }

  public async initialize(id: string) {
    this.setGear(await this.dispatcher.getGear(id));

    if (this.gear) {
      this.setName(this.gear.getName());
      this.setWeight(this.gear.getWeight());
      this.setInitialWeight(this.gear.getWeight());
      this.setCompany(this.gear.getCompany());
      this.setPreviewSrc(this.gear.getImageUrl());
      // 세분 카테고리는 그룹(GearFilter)으로 매핑해 선택한다(DM-4).
      this.selectFilterWith(this.gear.getGroupCategory());
      this.setColor(this.gear.getColor());
      this.setInitialized(true);
    }
  }

  public override async _register(): Promise<Gear> {
    // 새 이미지 업로드 여부 확인
    const hasNewImage = !!this.getFile();
    const newImageUrl = await this.getFileUrl();
    const imageUrl = (newImageUrl || this.gear?.getImageUrl()) ?? '';

    const updatedGear = new Gear(
      this.gear?.getId() ?? '',
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      imageUrl,
      true,
      this.gear?.getIsCustom() ?? false,
      this.getSelectedFilter(),
      this.gear?.getUseless() ?? [],
      this.gear?.getUsed() ?? [],
      this.gear?.getBags() ?? [],
      this.gear?.getCreateDate() ?? Date.now(),
      this.getColor(),
      this.gear?.getCompanyKorean() ?? '',
      this.gear?.getNameKorean() ?? '',
      // 기존 gear에서 재구성 — specs/size 등 신규 필드를 보존한다.
      this.gear?.getExtra() ?? {}
    );

    await this.dispatcher.update(updatedGear);

    if (this.initialWeight !== updatedGear.getWeight()) {
      await this.dispatcher.updateBagWeight(
        this.gear?.getBags() ?? [],
        this.initialWeight,
        updatedGear.getWeight()
      );
    }

    // 공유 이미지 등록 (isCustom === false이고 새 이미지가 있는 경우)
    if (!updatedGear.getIsCustom() && hasNewImage && newImageUrl) {
      await this.registerSharedImage(updatedGear.getId(), newImageUrl);
    }

    await this.onRegister(updatedGear);

    app.getAnalyticsManager()?.logClick('gear_save', { mode: 'edit' });

    return updatedGear;
  }

  private async registerSharedImage(
    gearId: string,
    imageUrl: string
  ): Promise<void> {
    try {
      const gearImageStore = app.getGearImageStore();
      const firebase = app.getFirebase();
      const nickname = firebase.getNickname();
      const imageId = this.generateId();

      if (gearImageStore) {
        await gearImageStore.addImage(gearId, imageId, imageUrl, nickname);
      }
    } catch (error) {
      console.error('Error registering shared image:', error);
    }
  }

  @action
  private setGear(gear: Gear) {
    this.gear = gear;
  }

  @action
  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public override hide(): void {
    this.navigate.back();
  }

  public delete() {
    if (!this.gear) return;

    this.alertManager.show({
      message: `${this.gear.getName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.deleteGear();
      },
    });
  }

  private async deleteGear() {
    if (!this.gear) return;

    await this.dispatcher.remove(this.gear);
    app.getAnalyticsManager()?.logClick('gear_delete', { from: 'edit' });
    this.toastManager.show({ message: '삭제 되었습니다.' });
    this.navigate.replace('/(tabs)/(warehouse)');
  }

  @action
  private setInitialWeight(weight: string) {
    this.initialWeight = weight;
  }
}

export default GearEdit;
