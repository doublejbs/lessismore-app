import { makeAutoObservable, reaction } from 'mobx';
import Firebase from '../firebase/Firebase';
import Gear from '../gear/Gear';
import Order from '../order/Order';
import OrderType from '../order/OrderType';
import ToastManager from '../toast/ToastManager';
import FilterManager from '../filter/FilterManager';
import WarehouseDispatcher from './WarehouseDispatcher';
import WarehouseDispatcherType from './WarehouseDispatcherType';
import WarehouseFilter from './WarehouseFilter';

class Warehouse {
  public static readonly ORDER_KEY = 'warehouse';

  public static from(
    dispatcher: WarehouseDispatcher,
    toastManager: ToastManager,
    firebase: Firebase
  ) {
    return new Warehouse(
      dispatcher,
      toastManager,
      FilterManager.from(),
      Order.new(Warehouse.ORDER_KEY),
      firebase
    );
  }

  private gears: Gear[] = [];
  private loading = false;
  private initialized = false;
  private disposeReaction: () => void;
  private disposeLoginReaction: () => void;

  private constructor(
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly toastManager: ToastManager,
    private readonly filterManager: FilterManager,
    private readonly order: Order,
    private readonly firebase: Firebase
  ) {
    this.disposeReaction = reaction(
      () => this.order.getSelectedOrderType(),
      async () => {
        await this.refresh();
      }
    );
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.refreshWithLoading();
      }
    );

    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.isLoggedIn()) {
      await this.getList();
    } else {
      this.clear();
    }
    this.setInitialized(true);
  }

  private async refreshWithLoading() {
    this.setLoading(true);
    await this.refresh();
    this.setLoading(false);
  }

  public async refresh() {
    if (this.isInitialized()) {
      await this.refreshList();
    }
  }

  public clear() {
    this.setGears([]);
  }

  private async getList() {
    this.setLoading(true);
    await this.refreshList();
    this.setLoading(false);
  }

  private async refreshList() {
    if (this.isLoggedIn()) {
      await this.order.initialize();
      this.setGears(
        await this.dispatcher.getList(
          [this.filterManager.getSelectedFilter().getFilter()],
          this.order.getSelectedOrderType() ?? OrderType.NameAsc
        )
      );
    } else {
      this.clear();
    }
  }

  public async remove(value: Gear) {
    await this.dispatcher.remove(value);
    await this.getList();
    this.toastManager.show({ message: '삭제 되었습니다.' });
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  public getGears() {
    return this.gears;
  }

  public mapFilters<R>(callback: (filter: WarehouseFilter) => R) {
    return this.filterManager.mapFilters(callback);
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

  public async updateGear(gear: Gear) {
    this.setGears(
      this.gears.map(currentGear => {
        if (currentGear.isSame(gear)) {
          return gear;
        } else {
          return currentGear;
        }
      })
    );
  }

  public isEmpty() {
    return (
      this.gears.length === 0 &&
      this.filterManager.isAllFilterSelected() &&
      !this.isLoading()
    );
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public getOrder() {
    return this.order;
  }

  // 객체 소멸 시 reaction 정리
  private dispose() {
    this.disposeReaction();
    this.disposeLoginReaction();
  }

  private isLoggedIn() {
    return this.firebase.isLoggedIn();
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public isFirebaseInitialized() {
    return this.firebase.isInitialized();
  }

  public getSelectedFilter() {
    return this.filterManager.getSelectedFilter();
  }
}

export default Warehouse;
