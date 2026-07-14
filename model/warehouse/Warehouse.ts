import { makeAutoObservable, reaction } from 'mobx';
import Firebase from '../firebase/Firebase';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import { getGroupMembers } from '../gear/GearCategoryGroups';
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
  private query = '';
  // WH-2 2차(세분) 카테고리 필터 — null이면 전체(세분 미적용)
  private fineCategory: string | null = null;
  private loading = false;
  private initialized = false;

  private constructor(
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly toastManager: ToastManager,
    private readonly filterManager: FilterManager,
    private readonly order: Order,
    private readonly firebase: Firebase
  ) {
    reaction(
      () => this.order.getSelectedOrderType(),
      async () => {
        await this.refresh();
      }
    );
    reaction(
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
    const q = this.query.trim().toLowerCase();
    const queried = q
      ? this.gears.filter(
          gear =>
            gear.getDisplayName().toLowerCase().includes(q) ||
            gear.getDisplayCompany().toLowerCase().includes(q)
        )
      : this.gears;

    // 세분 필터는 추가 쿼리 없이 표시 단계에서만 적용한다(WH-2)
    if (this.fineCategory) {
      return queried.filter(gear => gear.getCategory() === this.fineCategory);
    }

    return queried;
  }

  public getQuery() {
    return this.query;
  }

  public setQuery(value: string) {
    this.query = value;
  }

  public getTotalWeight() {
    return this.getGears().reduce(
      (sum, gear) => sum + (Number(gear.getWeight()) || 0),
      0
    );
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
    this.setFineCategory(null);
    this.filterManager.deselectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.setFineCategory(null);
    this.filterManager.selectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  // 세분 칩 탭 — 같은 키를 다시 선택하면 전체(null)로 토글. 서버 재조회는 없지만,
  // 짧게 로딩(스켈레톤)을 노출해 리스트를 리마운트한다 → 스크롤이 최상단으로 리셋된다(1차 필터와 동일 UX).
  public async selectFineCategory(key: string | null) {
    const next = key !== null && key === this.fineCategory ? null : key;

    if (next === this.fineCategory) {
      return;
    }

    this.setLoading(true);
    this.setFineCategory(next);
    await new Promise(resolve => setTimeout(resolve, 200));
    this.setLoading(false);
  }

  private setFineCategory(value: string | null) {
    this.fineCategory = value;
  }

  public getFineCategory() {
    return this.fineCategory;
  }

  // 선택된 1차 필터의 세분 카테고리 옵션. 전체이거나 멤버가 2개 미만(레거시 키 포함 기준)이면 빈 배열.
  public getFineCategoryOptions(): string[] {
    const selected = this.filterManager.getSelectedFilter().getFilter();

    if (selected === GearFilter.All) {
      return [];
    }

    const members = getGroupMembers(selected);

    if (members.length < 2) {
      return [];
    }

    return members;
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
