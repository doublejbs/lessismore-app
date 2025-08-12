import { action, makeObservable, observable } from 'mobx';
import { Router } from 'expo-router';
import AbstractGearEdit from '@/model/gear/AbstractGearEdit';
import CustomGearCategory from '@/model/gear/custom/CustomGearCategory';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import GearEditDispatcher from '@/model/gear/edit/GearEditDispatcher';

class GearEdit extends AbstractGearEdit {
  public static from(
    dispatcher: GearEditDispatcher,
    navigate: Router,
    category: CustomGearCategory
  ) {
    return new GearEdit(dispatcher, navigate, category);
  }

  private gear: Gear | null = null;
  @observable private initialized = false;
  @observable private initialWeight = '';
  private onRegister: (gear: Gear) => Promise<void> = async () => {};

  private constructor(
    private readonly dispatcher: GearEditDispatcher,
    private readonly navigate: Router,
    category: CustomGearCategory
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
      this.selectFilterWith(this.gear.getCategory() as GearFilter);
      this.setColor(this.gear.getColor());
      this.setInitialized(true);
    }
  }

  public override async _register(): Promise<Gear> {
    const updatedGear = new Gear(
      this.gear?.getId() ?? '',
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      ((await this.getFileUrl()) || this.gear?.getImageUrl()) ?? '',
      true,
      this.gear?.getIsCustom() ?? false,
      this.getSelectedFilter(),
      this.gear?.getUseless() ?? [],
      this.gear?.getUsed() ?? [],
      this.gear?.getBags() ?? [],
      this.gear?.getCreateDate() ?? Date.now(),
      this.getColor(),
      this.gear?.getCompanyKorean() ?? ''
    );

    await this.dispatcher.update(updatedGear);

    if (this.initialWeight !== updatedGear.getWeight()) {
      await this.dispatcher.updateBagWeight(
        this.gear?.getBags() ?? [],
        updatedGear
      );
    }

    await this.onRegister(updatedGear);

    return updatedGear;
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

  @action
  private setInitialWeight(weight: string) {
    this.initialWeight = weight;
  }
}

export default GearEdit;
