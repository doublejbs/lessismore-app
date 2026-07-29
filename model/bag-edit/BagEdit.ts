import { ImperativeRouter } from 'expo-router';
import FilterManager from '../filter/FilterManager';
import BagStore from '../store/BagStore';
import app from '../app/App';
import WarehouseDispatcher from '../warehouse/WarehouseDispatcher';
import WarehouseDispatcherType from '../warehouse/WarehouseDispatcherType';
import Order from '../order/Order';
import Gear from '../gear/Gear';
import { makeAutoObservable, reaction } from 'mobx';
import OrderType from '../order/OrderType';
import WarehouseFilter from '../warehouse/WarehouseFilter';

class BagEdit {
  private static readonly ORDER_KEY = 'bag';

  public static from(router: ImperativeRouter, id: string) {
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
  private warehouseGears: Gear[] = [];
  private query = '';
  private loading = false;
  private initialized = false;
  private disposeReaction: () => void;

  private constructor(
    private readonly router: ImperativeRouter,
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
      const { weight, gears } = await this.bagStore.getBag(this.id, [
        this.filterManager.getAllFilter(),
      ]);

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
    await this.bagStore.save(this.id, [], [], this.selectedGears);
    this.back();
  }

  public back() {
    this.router.back();
  }

  public async toggleGear(gear: Gear) {
    if (this.hasGear(gear)) {
      await this.removeGear(gear);
    } else {
      await this.addGear(gear);
    }
  }

  public async addGear(gear: Gear) {
    if (this.hasGear(gear)) {
      return;
    } else {
      this.selectedGears.push(gear);
      this.filterManager.addFilterCount(gear.getGroupCategory());
      this.updateWeight();
      await this.bagStore.save(this.id, [gear], [], this.selectedGears);
    }
  }

  public async removeGear(gear: Gear) {
    this.selectedGears = this.selectedGears.filter(g => !g.isSame(gear));
    this.filterManager.minusFilterCount(gear.getGroupCategory());
    this.updateWeight();
    await this.bagStore.save(this.id, [], [gear], this.selectedGears);
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

  public showCustom() {
    // GE-8: 검색/직접 선택 시트로 진입(이 배낭 컨텍스트 — bagId 전달).
    this.router.push(`/gear-add-options?bagId=${this.id}`);
  }

  private setWarehouseGears(gears: Gear[]) {
    this.warehouseGears = gears;
  }

  public getQuery() {
    return this.query;
  }

  public setQuery(value: string) {
    this.query = value;
  }

  public mapWarehouseGears<R>(callback: (gear: Gear) => R) {
    const q = this.query.trim().toLowerCase();
    const list = q
      ? this.warehouseGears.filter(
          gear =>
            gear.getDisplayName().toLowerCase().includes(q) ||
            gear.getDisplayCompany().toLowerCase().includes(q)
        )
      : this.warehouseGears;
    return list.map(callback);
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

  public prependGears(gears: Gear[]) {
    this.setWarehouseGears([...gears, ...this.warehouseGears]);
  }
}

export default BagEdit;
