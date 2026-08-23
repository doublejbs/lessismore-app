import { action, makeObservable, observable } from 'mobx';
import CustomGearCategory from './custom/CustomGearCategory';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import GearFilter from '@/model/gear/GearFilter';
import Gear from '@/model/gear/Gear';
import app from '@/model/app/App';

// 이미지 필드는 두지 않는다 — 장비 이미지 미제공 원칙(DataModel §1, GE-1).
abstract class AbstractGearEdit {
  @observable private name = '';
  @observable private company = '';
  @observable private weight = '';
  @observable private loading = false;
  @observable private errorMessage = '';
  @observable private color = '';

  protected constructor(
    private readonly category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    this.name = name;
    this.company = company;
    this.weight = weight;
    this.color = color;
    makeObservable(this);
  }

  protected abstract _register(): Promise<Gear>;

  protected abstract hide(): void;

  protected generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  @action
  public setName(value: string) {
    this.name = value;
  }

  @action
  public setCompany(value: string) {
    this.company = value;
  }

  @action
  public setWeight(value: string) {
    this.weight = value;
  }

  @action
  public setColor(value: string) {
    this.color = value;
  }

  public getName() {
    return this.name;
  }

  public getCompany() {
    return this.company;
  }

  public getWeight() {
    return this.weight;
  }

  public getColor() {
    return this.color;
  }

  public async register() {
    try {
      this.validate();
      this.setLoading(true);
      await this._register();
      this.setLoading(false);
      this.hide();
    } catch {
      this.setLoading(false);
    }
  }

  protected validate() {
    switch (true) {
      case !this.name: {
        this.setErrorMessage(app.getL10n().t('gearEdit.nameRequired'));
        throw Error('Invalid name');
      }
      default: {
        break;
      }
    }
  }

  @action
  protected setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  @action
  private setErrorMessage(value: string) {
    this.errorMessage = value;
    setTimeout(() => {
      this.errorMessage = '';
    }, 3000);
  }

  public getErrorMessage() {
    return this.errorMessage;
  }

  public selectFilter(filter: WarehouseFilter) {
    this.category.selectFilter(filter);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.category.mapFilters(callback);
  }

  protected getSelectedFilter() {
    return this.category.getSelectedFilter();
  }

  protected getSelectedFirstCategory() {
    return this.category.getSelectedFirstCategory();
  }

  protected selectFilterWith(gearFilter: GearFilter) {
    this.category.selectFilterWith(gearFilter);
  }
}

export default AbstractGearEdit;
