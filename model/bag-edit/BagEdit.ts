import { Router } from 'expo-router';
import FilterManager from '../filter/FilterManager';
import BagStore from '../store/BagStore';
import app from '../app/App';
import WarehouseDispatcher from '../warehouse/WarehouseDispatcher';
import WarehouseDispatcherType from '../warehouse/WarehouseDispatcherType';
import Order from '../order/Order';
import Gear from '../gear/Gear';
import { makeAutoObservable, reaction } from 'mobx';
import OrderType from '../order/OrderType';
import GearFilter from '../gear/GearFilter';
import WarehouseFilter from '../warehouse/WarehouseFilter';

class BagEdit {
  private static readonly ORDER_KEY = 'bag';

  public static from(router: Router, id: string) {
    return new BagEdit(
      router,
      id,
      app.getBagStore()!,
      WarehouseDispatcher.new(),
      FilterManager.from(),
      Order.new(BagEdit.ORDER_KEY)
    );
  }

  private selectedGears: Gear[] = [];
  private weight: number = 0;
  private toRemoveGears: Gear[] = [];
  private toAddGears: Gear[] = [];
  private warehouseGears: Gear[] = [];
  private loading = false;
  private initialized = false;
  private customVisible = false;
  private disposeReaction: () => void;
  private addMenuVisible = false;

  private constructor(
    private readonly router: Router,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly filterManager: FilterManager,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
    this.disposeReaction = reaction(
      () => this.order.getSelectedOrderType(),
      async () => {
        await this.initialize();
      }
    );
  }

  public dispose() {
    this.disposeReaction();
  }

  public async initialize() {
    if (this.isLoading()) {
      return;
    } else {
      this.setLoading(true);
      this.order.initialize();
      const { weight, gears } = await this.bagStore.getBag(
        this.id,
        [this.filterManager.getSelectedFilter().getFilter()],
        this.order.getSelectedOrderType() ?? OrderType.NameAsc
      );

      this.setSelectedGears(gears);
      this.setWeight(+weight);
      await this.getList();
      this.filterManager.initializeWithSelectedGears(this.selectedGears);
      this.setLoading(false);
      this.setInitialized(true);
    }
  }

  private async getList() {
    this.setWarehouseGears(
      await this.dispatcher.getList(
        [this.filterManager.getSelectedFilter().getFilter()],
        this.order.getSelectedOrderType() ?? OrderType.NameAsc
      )
    );
  }

  private setSelectedGears(gears: Gear[]) {
    this.selectedGears = gears;
  }

  private setWeight(weight: number) {
    this.weight = weight;
  }

  public getWeight() {
    return Number(this.weight) / 1000;
  }

  public getCount() {
    return this.selectedGears.length;
  }

  public async save() {
    await this.bagStore.save(
      this.id,
      this.toAddGears,
      this.toRemoveGears,
      this.selectedGears
    );
    this.back();
  }

  public back() {
    this.router.back();
  }

  public toggleGear(gear: Gear) {
    if (this.hasGear(gear)) {
      this.removeGear(gear);
    } else {
      this.addGear(gear);
    }
  }

  public addGear(gear: Gear) {
    if (this.hasGear(gear)) {
      return;
    } else {
      this.selectedGears.push(gear);
      this.toAddGears.push(gear);
      this.toRemoveGears = this.toRemoveGears.filter(g => !g.isSame(gear));
      this.filterManager.addFilterCount(gear.getCategory() as GearFilter);
      this.updateWeight();
    }
  }

  public removeGear(gear: Gear) {
    this.selectedGears = this.selectedGears.filter(g => !g.isSame(gear));
    this.toAddGears = this.toAddGears.filter(g => !g.isSame(gear));
    this.toRemoveGears.push(gear);
    this.filterManager.minusFilterCount(gear.getCategory() as GearFilter);
    this.updateWeight();
  }

  private updateWeight() {
    const totalWeight = this.selectedGears.reduce(
      (acc: number, gear) => acc + Number(gear.getWeight()),
      0
    );
    this.setWeight(totalWeight);
  }

  public hasGear(gear: Gear) {
    return this.selectedGears.some(g => g.isSame(gear));
  }

  public hideAddMenu() {
    this.setCustomVisible(false);
    this.setAddMenuVisible(false);
  }

  public showSearch() {
    this.hideAddMenu();
    this.router.push('/search');
  }

  public showCustom() {
    this.hideAddMenu();
    this.router.push('/custom');
  }

  private setWarehouseGears(gears: Gear[]) {
    this.warehouseGears = gears;
  }

  public mapWarehouseGears<R>(callback: (gear: Gear) => R) {
    return this.warehouseGears.map(callback);
  }

  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      this.deselectFilter(filter);
    } else {
      this.selectFilter(filter);
    }
  }

  public async deselectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.deselectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.filterManager.selectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getOrder() {
    return this.order;
  }

  private setCustomVisible(value: boolean) {
    this.customVisible = value;
  }

  public isCustomVisible() {
    return this.customVisible;
  }

  public prependGears(gears: Gear[]) {
    this.setWarehouseGears([...gears, ...this.warehouseGears]);
  }

  public showAddMenu() {
    this.setAddMenuVisible(true);
  }

  private setAddMenuVisible(value: boolean) {
    this.addMenuVisible = value;
  }

  public isAddMenuVisible() {
    return this.addMenuVisible;
  }
}

export default BagEdit;
