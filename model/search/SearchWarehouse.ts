import Gear from '@/model/gear/Gear';
import { action, makeObservable, observable, reaction } from 'mobx';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import { Router } from 'expo-router';
import app from '@/model/app/App';
import SearchDispatcherType from '@/model/search/SearchDispatcherType';
import SearchDispatcher from '@/model/search/SearchDispatcher';
import { InteractionManager } from 'react-native';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';

class SearchWarehouse {
  public static new(router: Router) {
    return new SearchWarehouse(
      SearchDispatcher.new(),
      router,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      Order.new(Warehouse.ORDER_KEY)
    );
  }

  @observable private keyword: string = '';
  @observable private result: Array<Gear> = [];
  @observable private selected: Array<Gear> = [];
  @observable private loading = false;
  @observable private hasMore = false;
  private page = 0;
  private disposeLoginReaction: () => void;

  protected constructor(
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly navigation: Router,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseLocalStorage: Order
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
  }

  public changeKeyword(keyword: string) {
    this.setLoading(true);
    this.setKeyword(keyword);
    this.setResult([]);
    InteractionManager.runAfterInteractions(() => {
      setTimeout(() => {
        this.executeSearch();
      }, 300);
    });
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

  private deselect(gear: Gear) {
    this.selected = this.selected.filter(item => !item.isSame(gear));
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
  private appendResult(value: Array<Gear>) {
    this.result.push(...value);
  }

  @action
  private setKeyword(value: string) {
    this.keyword = value;
  }

  @action
  private setResult(value: Array<Gear>) {
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
    this.warehouseLocalStorage.selectLastOrderOption();
    this.back(this.selected);
  }

  public back(_?: Array<Gear>) {
    this.navigation.back();
  }
}

export default SearchWarehouse;
