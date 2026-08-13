import { makeAutoObservable } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import Gear from '@/model/gear/Gear';
import WarehouseFilter from '@/model/warehouse/WarehouseFilter';
import BagDetailFilterManager from '@/model/bag-detail/BagDetailFilterManager';
import BagTemplateDetailDispatcher from '@/model/bag-template/BagTemplateDetailDispatcher';
import {
  setBagTemplateNameEditContext,
} from '@/model/bag-template/BagTemplateNameEditHandoff';
import app from '@/model/app/App';

class BagTemplateDetail {
  public static from(router: ImperativeRouter, id: string) {
    return new BagTemplateDetail(
      router,
      id,
      BagTemplateDetailDispatcher.new(),
      BagDetailFilterManager.from()
    );
  }

  private initialized = false;
  private loading = false;
  private missing = false;
  private name = '';
  private weight = 0;
  private gears: Gear[] = [];

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly id: string,
    private readonly dispatcher: BagTemplateDetailDispatcher,
    private readonly filterManager: BagDetailFilterManager
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.loading) {
      return;
    }

    this.loading = true;

    try {
      const data = await this.dispatcher.get(this.id);

      if (!data) {
        this.missing = true;
        this.initialized = true;

        return;
      }

      this.missing = false;
      this.name = data.template.getName();
      this.weight = data.template.getWeightGram();
      this.gears = data.gears;
      this.filterManager.selectFirstFilter();
      this.initialized = true;
    } catch (error) {
      console.error('템플릿 상세 조회 중 오류 발생:', error);
      this.missing = true;
      this.initialized = true;
    } finally {
      this.loading = false;
    }
  }

  public isInitialized() {
    return this.initialized;
  }

  public isMissing() {
    return this.missing;
  }

  public getName() {
    return this.name;
  }

  public getWeight() {
    return Number((this.weight / 1000).toFixed(2));
  }

  public getCount() {
    return this.gears.length;
  }

  public getGearsByCategory() {
    return this.filterManager.groupGearsByCategory(this.gears);
  }

  public getGears() {
    return this.gears;
  }

  public openNameEdit() {
    setBagTemplateNameEditContext({
      name: this.name,
      onSave: async name => {
        await this.updateName(name);
      },
    });
    this.router.push({
      pathname: '/bag-template-save',
      params: { mode: 'edit', templateId: this.id },
    });
  }

  public async updateName(name: string) {
    await this.dispatcher.updateName(this.id, name);
    this.name = name;
  }

  public goToEdit() {
    this.router.push(`/bag-template/${this.id}/edit`);
  }

  public goToCreate() {
    this.router.push({
      pathname: '/bag-template-create',
      params: { templateId: this.id },
    });
  }

  public goToGear(gear: Gear) {
    app.getAnalyticsManager()?.logClick('gear_item', {
      from: 'bag_template_detail',
    });
    this.router.push(`/gear-detail/${gear.getId()}`);
  }

  public back() {
    this.router.back();
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }
}

export default BagTemplateDetail;
