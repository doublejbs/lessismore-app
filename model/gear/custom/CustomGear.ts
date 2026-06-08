import { makeObservable } from 'mobx';
import app from '@/model/app/App';
import GearStore from '@/model/store/GearStore';
import Gear from '@/model/gear/Gear';
import CustomGearCategory from './CustomGearCategory';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import AbstractGearEdit from '../AbstractGearEdit';
import { Router } from 'expo-router';
import Order from '@/model/order/Order';
import Warehouse from '@/model/warehouse/Warehouse';
import BagDetail from '@/model/bag-detail/BagDetail';
import SearchStore from '@/model/search/SearchStore';
import GearFilter from '@/model/gear/GearFilter';
import AlertManager from '@/model/alert/AlertManager';

class CustomGear extends AbstractGearEdit {
  public static new(navigate: Router) {
    return new CustomGear(
      navigate,
      app.getGearStore()!,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      Order.new(Warehouse.ORDER_KEY),
      Order.new(BagDetail.ORDER_KEY),
      app.getSearchStore()!,
      app.getAlertManager()!,
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      '',
      ''
    );
  }

  private searchResults: Gear[] = [];
  private selectedSearchGear: Gear | null = null;

  protected constructor(
    private readonly navigate: Router,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order,
    private readonly searchStore: SearchStore,
    private readonly alertManager: AlertManager,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super(category, name, company, weight, color);
    makeObservable(this);
  }

  public async initialize() {
    if (!this.isLoggedIn()) {
      this.logInAlertManager.show();
    }
  }

  public async _register() {
    if (this.selectedSearchGear) {
      await this.gearStore.register([this.selectedSearchGear]);
      await this.warehouseOrder.saveLastOrderOption();
      await this.bagDetailOrder.saveLastOrderOption();
      return this.selectedSearchGear;
    } else {
      const gear = new Gear(
        this.generateId(),
        this.getName(),
        this.getCompany(),
        this.getWeight(),
        await this.getFileUrl(),
        true,
        true,
        this.getSelectedFilter(),
        [],
        [],
        [],
        Date.now(),
        this.getColor(),
        this.getCompany(),
        this.getName()
      );

      await this.gearStore.register([gear]);
      await this.warehouseOrder.saveLastOrderOption();
      await this.bagDetailOrder.saveLastOrderOption();
      return gear;
    }
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }

  public override hide() {
    this.navigate.back();
  }

  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }

  public async searchName(query: string) {
    const results = await this.searchStore.searchList(query, 0);
    this.setSearchResults(results.gears);
  }

  private setSearchResults(results: Gear[]) {
    this.searchResults = results;
  }

  public getSearchResults(): Gear[] {
    return this.searchResults;
  }

  public clearSearchResults() {
    this.setSearchResults([]);
  }

  public async selectSearchGear(gear: Gear) {
    if (await this.gearStore.hasGear(gear.getId())) {
      this.alertManager.show({
        message: '이미 추가된 장비입니다',
        confirmText: '확인',
        onConfirm: async () => {},
      });
    } else {
      this.setSelectedSearchGear(gear);
      this.setName(gear.getName());
      this.setCompany(gear.getCompany());
      this.setWeight(`${gear.getWeight()}`);
      this.setColor(gear.getColor());
      this.setPreviewSrc(gear.getImageUrl());

      const category = gear.getCategory() as GearFilter;
      this.selectFilterWith(category);
      this.clearSearchResults();
    }
  }

  private setSelectedSearchGear(gear: Gear) {
    this.selectedSearchGear = gear;
  }
}

export default CustomGear;
