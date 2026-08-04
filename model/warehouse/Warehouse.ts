import { makeAutoObservable, reaction } from 'mobx';
import Firebase from '../firebase/Firebase';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import { getSelectableFineCategories } from '../gear/GearCategoryGroups';
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

  /**
   * 초기 1차 필터를 세운다 — 홈 미리보기(HM-4)에서 카테고리를 좁힌 채 들어올 때 쓴다.
   * 들어가서 다시 고르게 하지 않는다.
   *
   * `initialize()`보다 **먼저** 불러야 첫 조회가 그 카테고리로 나간다. 이미 선택된
   * 필터거나 알 수 없는 키면 아무것도 하지 않는다(조회를 두 번 내지 않는다).
   */
  public applyInitialFilter(filter: GearFilter) {
    if (filter === GearFilter.All) {
      return;
    }

    const target = this.filterManager
      .mapFilters(candidate => candidate)
      .find(candidate => candidate.isSame(filter));

    if (!target || target.isSelected()) {
      return;
    }

    this.filterManager.selectFilter(target);
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
    // 표시명(한글 우선)뿐 아니라 캐논컬 원본명·브랜드까지 본다. `랜드네스트S텐트타프세트`처럼
    // 표시명이 한글인 장비는 원본명(`Land Nest S Tent Tarp Set`)으로 찾을 수 없었다
    // (2026-08-04 시뮬레이터 확인 — `tent` 검색 결과 0건).
    const queried = q
      ? this.gears.filter(gear =>
          [
            gear.getDisplayName(),
            gear.getName(),
            gear.getDisplayCompany(),
            gear.getCompany(),
          ].some(value => value.toLowerCase().includes(q))
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

  // 이미 선택된 필터를 다시 눌러도 해제하지 않고 그대로 유지한다(선택 칩 재탭 = 변화 없음, WH-2).
  // 다른 필터를 누르면 그 필터로 전환되고, 전체로 돌아가려면 '전체' 칩을 누른다.
  public toggleFilter(filter: WarehouseFilter) {
    if (filter.isSelected()) {
      return;
    }

    void this.selectFilter(filter);
  }

  public async selectFilter(filter: WarehouseFilter) {
    this.setLoading(true);
    this.setFineCategory(null);
    this.filterManager.selectFilter(filter);
    await this.getList();
    this.setLoading(false);
  }

  // 세분 칩 탭 — 이미 선택된 칩을 다시 눌러도 해제하지 않는다(재탭 무시, 1차 필터와 동일).
  // '전체' 칩(key=null)으로 해제한다. 서버 재조회는 없지만 짧게 로딩(스켈레톤)을 노출해
  // 리스트를 리마운트한다 → 스크롤이 최상단으로 리셋된다.
  public async selectFineCategory(key: string | null) {
    if (key === this.fineCategory) {
      return;
    }

    this.setLoading(true);
    this.setFineCategory(key);
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

    // 라벨 없는 레거시 키를 빼고 센다 — 그대로 넘기면 빈 칩이 생긴다(DM-4).
    const members = getSelectableFineCategories(selected);

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
