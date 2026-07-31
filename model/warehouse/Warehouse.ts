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
  // WH-2 `안 쓴 장비만` — 홈 창고 카드(HM-4)의 정리 유도 줄로 들어올 때 켜진다.
  private unusedOnly = false;
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
    const queried = q
      ? this.gears.filter(
          gear =>
            gear.getDisplayName().toLowerCase().includes(q) ||
            gear.getDisplayCompany().toLowerCase().includes(q)
        )
      : this.gears;

    // 세분 필터는 추가 쿼리 없이 표시 단계에서만 적용한다(WH-2)
    const fined = this.fineCategory
      ? queried.filter(gear => gear.getCategory() === this.fineCategory)
      : queried;

    // `안 쓴 장비만`도 같은 방식으로 표시 단계에서 거른다(추가 쿼리 없음).
    return this.unusedOnly ? fined.filter(gear => gear.isNeverUsed()) : fined;
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

  // 홈에서 정리 유도 줄로 들어올 때 켠다(HM-4). initialize() 전에 부른다.
  public applyUnusedOnly() {
    this.unusedOnly = true;
  }

  public isUnusedOnly() {
    return this.unusedOnly;
  }

  // 창고에서 직접 켜고 끈다(WH-2). 홈에서 켠 채로 들어온 경우도 같은 칩으로 해제한다.
  public toggleUnusedOnly() {
    this.unusedOnly = !this.unusedOnly;
  }

  /**
   * 지금 보고 있는 범위에 한 번도 안 쓴 장비가 있는지.
   *
   * 칩 노출 조건이다 — 눌러도 빈 목록만 나오는 칩은 노이즈라 없을 때는 아예 그리지 않는다.
   * **`unusedOnly` 적용 전 집합**으로 판단해야 한다. 켠 뒤에 목록이 그 장비들로만 채워졌다고
   * 조건이 유지되는 건 맞지만, 반대로 끈 상태와 켠 상태에서 칩이 나타났다 사라지면 안 된다.
   */
  public hasNeverUsedGear() {
    return this.gears.some(gear => gear.isNeverUsed());
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
