import { makeAutoObservable, action } from 'mobx';
import { Router } from 'expo-router';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import SearchDispatcherType from '@/model/search/SearchDispatcherType';
import SearchDispatcher from '@/model/search/SearchDispatcher';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import Order from '@/model/order/Order';
import AlertManager from '@/model/alert/AlertManager';
import ToastManager from '@/model/toast/ToastManager';
import OrderType from '@/model/order/OrderType';
import app from '@/model/app/App';
import Warehouse from '@/model/warehouse/Warehouse';
import BagDetail from '@/model/bag-detail/BagDetail';

class ExploreWarehouse {
  public static new(router: Router) {
    const firebase = app.getFirebase();
    const searchDispatcher = SearchDispatcher.new();
    const logInAlertManager = app.getLogInAlertManager()!;
    const warehouseOrder = Order.new(Warehouse.ORDER_KEY);
    const bagDetailOrder = Order.new(BagDetail.ORDER_KEY);
    const alertManager = app.getAlertManager()!;
    const toastManager = app.getToastManager()!;

    return new ExploreWarehouse(
      searchDispatcher,
      firebase,
      logInAlertManager,
      warehouseOrder,
      bagDetailOrder,
      alertManager,
      toastManager,
      router
    );
  }

  private gears: Gear[] = [];
  private loading = false;
  private loadingMore = false;
  private hasMore = true;
  private lastVisible: any = undefined;
  private selectedCategory: GearFilter = GearFilter.All;
  private selectedSort: OrderType = OrderType.CreatedDesc;

  public constructor(
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly router: Router
  ) {
    makeAutoObservable(this);
  }

  public async load(loading = true) {
    if (loading) {
      this.setLoading(true);
    }
    this.lastVisible = undefined;

    try {
      const result = await this.searchDispatcher.exploreList(
        this.selectedCategory,
        this.selectedSort,
        undefined
      );
      this.setGears(result.gears);
      this.setHasMore(result.hasMore);
      this.setLastVisible(result.lastVisible);
    } catch (error) {
      console.error('Error in ExploreWarehouse.load:', error);
      this.setGears([]);
    } finally {
      this.setLoading(false);
    }
  }

  public async loadMore() {
    if (this.loadingMore || !this.hasMore || this.loading) {
      return;
    }
    this.setLoadingMore(true);

    try {
      const result = await this.searchDispatcher.exploreList(
        this.selectedCategory,
        this.selectedSort,
        this.lastVisible
      );

      // 중복 방지: 이미 존재하는 ID는 제외
      const existingIds = new Set(this.gears.map(g => g.getId()));
      const newGears = result.gears.filter(g => !existingIds.has(g.getId()));

      this.appendGears(newGears);
      this.setHasMore(result.hasMore);
      this.setLastVisible(result.lastVisible);
    } catch (error) {
      console.error('Error in ExploreWarehouse.loadMore:', error);
    } finally {
      this.setLoadingMore(false);
    }
  }

  public selectCategory(category: GearFilter) {
    this.selectedCategory = category;
    this.load();
  }

  public selectSort(sort: OrderType) {
    this.selectedSort = sort;
    this.load();
  }

  @action
  private setGears(gears: Gear[]) {
    this.gears = gears;
  }

  @action
  private appendGears(gears: Gear[]) {
    this.gears = [...this.gears, ...gears];
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  @action
  private setLoadingMore(value: boolean) {
    this.loadingMore = value;
  }

  @action
  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  @action
  private setLastVisible(value: any) {
    this.lastVisible = value;
  }

  public getGears() {
    return this.gears;
  }

  public isLoading() {
    return this.loading;
  }

  public isLoadingMore() {
    return this.loadingMore;
  }

  public getSelectedCategory() {
    return this.selectedCategory;
  }

  public getSelectedSort() {
    return this.selectedSort;
  }

  public async registerSingle(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 리스트 갱신
    this.load(false);
    return true;
  }

  public async removeSingle(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    this.alertManager.show({
      message: '모든 배낭에서 장비가 제거됩니다.\n정말 제거하시겠습니까?',
      confirmText: '확인',
      onConfirm: async () => {
        await this.searchDispatcher.remove(gear);
        await this.warehouseOrder.saveLastOrderOption();
        await this.bagDetailOrder.saveLastOrderOption();

        this.load(false);
        this.toastManager.show({ message: '장비가 제거되었습니다.' });
      },
    });
    return true;
  }

  public goToGearDetail(gear: Gear) {
    this.router.push(`/gear-detail/${gear.getId()}`);
  }
}

export default ExploreWarehouse;
