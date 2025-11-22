import Gear from '@/model/gear/Gear';
import { action, makeObservable, observable, reaction } from 'mobx';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import { Router } from 'expo-router';
import app from '@/model/app/App';
import SearchDispatcherType from '@/model/search/SearchDispatcherType';
import SearchDispatcher from '@/model/search/SearchDispatcher';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';
import BagDetail from '../bag-detail/BagDetail';

class SearchWarehouse {
  public static new(router: Router) {
    return new SearchWarehouse(
      SearchDispatcher.new(),
      router,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      Order.new(Warehouse.ORDER_KEY),
      Order.new(BagDetail.ORDER_KEY)
    );
  }

  @observable private keyword: string = '';
  @observable private result: Gear[] = [];
  @observable private selected: Gear[] = [];
  @observable private loading = false;
  @observable private hasMore = false;
  @observable private topSearches: string[] = [];
  @observable private loadingTopSearches = false;
  private page = 0;
  private disposeLoginReaction: () => void;
  private debounceTimer: NodeJS.Timeout | null = null;

  protected constructor(
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly navigation: Router,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order
  ) {
    makeObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.executeSearch();
      }
    );
  }

  public dispose() {
    this.disposeLoginReaction();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  public changeKeyword(keyword: string) {
    this.setLoading(true);
    this.setKeyword(keyword);
    this.setResult([]);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.executeSearch();
    }, 300) as unknown as NodeJS.Timeout;
  }

  @action
  public toggle(gear: Gear) {
    if (this.isSelected(gear)) {
      this.deleteSelected(gear);
    } else {
      this.select(gear);
    }
  }

  private select(gear: Gear) {
    if (this.firebase.isLoggedIn()) {
      this.selected.push(gear);
    } else {
      this.logInAlertManager.show();
    }
  }

  @action
  public deleteSelected(gear: Gear) {
    this.selected = this.selected.filter(item => !item.isSame(gear));
  }

  public isSelected(gear: Gear) {
    return this.selected.some(item => item.isSame(gear));
  }

  public async searchMore() {
    if (this.hasMore) {
      this.setLoading(true);

      if (this.getKeyword()) {
        const { gears, hasMore } = await this.searchDispatcher.searchList(
          this.getKeyword(),
          this.plusPage()
        );

        this.appendResult(gears);
        this.setHasMore(hasMore);
      } else {
        this.setResult([]);
      }
      this.setLoading(false);
    }
  }

  private async executeSearch() {
    this.setLoading(true);
    this.clearPage();

    if (this.getKeyword()) {
      const { gears, hasMore } = await this.searchDispatcher.searchList(
        this.getKeyword(),
        this.plusPage()
      );

      this.setResult(gears);
      this.setHasMore(hasMore);
    } else {
      this.setResult([]);
    }
    this.setLoading(false);
  }

  @action
  private appendResult(value: Gear[]) {
    this.result.push(...value);
  }

  @action
  private setKeyword(value: string) {
    this.keyword = value;
  }

  @action
  private setResult(value: Gear[]) {
    this.result = value;
  }

  public getResult() {
    return this.result;
  }

  public getKeyword() {
    return this.keyword;
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public isEmpty() {
    return !this.result.length;
  }

  @action
  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  public canLoadMore() {
    return this.hasMore;
  }

  protected clear() {
    this.clearKeyword();
    this.clearPage();
    this.setResult([]);
    this.setHasMore(false);
    this.setLoading(false);
    this.clearSelected();
  }

  private clearSelected() {
    this.selected = [];
  }

  private clearPage() {
    this.page = 0;
  }

  private plusPage() {
    return this.page++;
  }

  public clearKeyword() {
    this.setKeyword('');
  }

  public hasSelected() {
    return this.selected.length > 0;
  }

  public getSelectedCount() {
    return this.selected.length;
  }

  public getSelected() {
    return this.selected;
  }

  public async register() {
    await this.searchDispatcher.register(this.selected);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();
    this.back(this.selected);
  }

  public async registerSingle(gear: Gear) {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 결과 목록에서 해당 gear의 isAdded 상태를 업데이트하기 위해 재검색
    await this.executeSearch();
  }

  public async removeSingle(gear: Gear) {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    await this.searchDispatcher.remove(gear);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 결과 목록에서 해당 gear의 isAdded 상태를 업데이트하기 위해 재검색
    await this.executeSearch();
  }

  public back(_?: Gear[]) {
    this.navigation.back();
  }

  public async loadTopSearches() {
    if (this.topSearches.length > 0) {
      return;
    }

    this.setLoadingTopSearches(true);
    const searches = await this.searchDispatcher.getTopSearches();
    this.setTopSearches(searches);
    this.setLoadingTopSearches(false);
  }

  @action
  private setTopSearches(value: string[]) {
    this.topSearches = value;
  }

  @action
  private setLoadingTopSearches(value: boolean) {
    this.loadingTopSearches = value;
  }

  public getTopSearches() {
    return this.topSearches;
  }

  public isLoadingTopSearches() {
    return this.loadingTopSearches;
  }

  public searchByKeyword(keyword: string) {
    this.changeKeyword(keyword);
  }
}

export default SearchWarehouse;
