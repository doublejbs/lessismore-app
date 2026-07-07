import { action, makeObservable, observable, reaction } from 'mobx';
import { Router } from 'expo-router';
import Gear from '@/model/gear/Gear';
import BrowseSort from '@/model/search/BrowseSort';
import SearchStore from '@/model/search/SearchStore';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Firebase from '@/model/firebase/Firebase';
import GearRowActions from './GearRowActions';
import app from '@/model/app/App';

// SR-7 카테고리·브랜드 장비 목록 + 정렬 화면의 도메인 모델.
// 결과 행의 창고추가/배낭담기/상세이동은 SearchWarehouse에 위임해 기존 동작을 재사용한다.
class Browse implements GearRowActions {
  public static new(
    router: Router,
    category: string,
    companyKorean: string,
    sort: BrowseSort
  ) {
    const firebase = app.getFirebase();
    const searchStore = app.getSearchStore()!;
    const searchWarehouse = SearchWarehouse.new(router);

    return new Browse(
      router,
      firebase,
      searchStore,
      searchWarehouse,
      category,
      companyKorean,
      sort
    );
  }

  @observable private result: Gear[] = [];
  @observable private sort: BrowseSort;
  @observable private loading = false;
  @observable private hasMore = false;
  @observable private initialized = false;
  private page = 0;
  private disposeLoginReaction: () => void;

  protected constructor(
    private readonly navigation: Router,
    private readonly firebase: Firebase,
    private readonly searchStore: SearchStore,
    private readonly searchWarehouse: SearchWarehouse,
    private readonly category: string,
    private readonly companyKorean: string,
    initialSort: BrowseSort
  ) {
    this.sort = initialSort;
    makeObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.reload();
      }
    );
  }

  public dispose() {
    this.disposeLoginReaction();
    this.searchWarehouse.dispose();
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    this.setInitialized(true);
    await this.reload();
  }

  private buildBrowseParams(page: number) {
    const params: {
      category?: string;
      companyKorean?: string;
      sort: BrowseSort;
      page: number;
    } = {
      sort: this.sort,
      page,
    };

    if (this.category) {
      params.category = this.category;
    }

    if (this.companyKorean) {
      params.companyKorean = this.companyKorean;
    }

    return params;
  }

  public async reload() {
    this.setLoading(true);
    this.clearPage();

    const { gears, hasMore } = await this.searchStore.browse(
      this.buildBrowseParams(this.plusPage())
    );

    this.setResult(gears);
    this.setHasMore(hasMore);
    this.setLoading(false);
  }

  public async loadMore() {
    if (!this.hasMore || this.loading) {
      return;
    }

    this.setLoading(true);

    const { gears, hasMore } = await this.searchStore.browse(
      this.buildBrowseParams(this.plusPage())
    );

    this.appendResult(gears);
    this.setHasMore(hasMore);
    this.setLoading(false);
  }

  public async changeSort(sort: BrowseSort) {
    if (this.sort === sort) {
      return;
    }

    this.setSort(sort);
    await this.reload();
  }

  public async registerSingle(gear: Gear): Promise<boolean> {
    const success = await this.searchWarehouse.registerSingle(gear);

    if (success) {
      await this.reload();
    }

    return success;
  }

  public async removeSingle(gear: Gear): Promise<boolean> {
    return this.searchWarehouse.removeSingle(gear);
  }

  public goToGearDetail(gear: Gear) {
    this.navigation.push(`/gear-detail/${gear.getId()}`);
  }

  public getResult() {
    return this.result;
  }

  public getSort() {
    return this.sort;
  }

  public getCategory() {
    return this.category;
  }

  public getCompanyKorean() {
    return this.companyKorean;
  }

  public isLoading() {
    return this.loading;
  }

  public isEmpty() {
    return !this.result.length;
  }

  public canLoadMore() {
    return this.hasMore;
  }

  public isInitialized() {
    return this.initialized;
  }

  @action
  private setResult(value: Gear[]) {
    this.result = value;
  }

  @action
  private appendResult(value: Gear[]) {
    this.result.push(...value);
  }

  @action
  private setSort(value: BrowseSort) {
    this.sort = value;
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  @action
  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  @action
  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  private clearPage() {
    this.page = 0;
  }

  private plusPage() {
    return this.page++;
  }
}

export default Browse;
