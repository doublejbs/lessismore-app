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
    brand: string,
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
      brand,
      sort
    );
  }

  @observable private result: Gear[] = [];
  @observable private sort: BrowseSort;
  @observable private loading = false;
  @observable private hasMore = false;
  @observable private initialized = false;
  private page = 0;
  private requestId = 0;
  private disposeLoginReaction: () => void;

  protected constructor(
    private readonly navigation: Router,
    private readonly firebase: Firebase,
    private readonly searchStore: SearchStore,
    private readonly searchWarehouse: SearchWarehouse,
    private readonly category: string,
    private readonly brand: string,
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
      brands?: string[];
      sort: BrowseSort;
      page: number;
    } = {
      sort: this.sort,
      page,
    };

    if (this.category) {
      params.category = this.category;
    }

    if (this.brand) {
      // 단일 브랜드 콜사이트 — browse 다중 브랜드 시그니처에 맞춰 길이 1 배열로 전달(SR-7).
      params.brands = [this.brand];
    }

    return params;
  }

  public async reload() {
    const id = ++this.requestId;

    this.setLoading(true);
    this.clearPage();

    const { gears, hasMore } = await this.searchStore.browse(
      this.buildBrowseParams(this.plusPage())
    );

    if (id !== this.requestId) {
      return;
    }

    this.setResult(gears);
    this.setHasMore(hasMore);
    this.setLoading(false);
  }

  public async loadMore() {
    if (!this.hasMore || this.loading) {
      return;
    }

    const id = ++this.requestId;

    this.setLoading(true);

    const { gears, hasMore } = await this.searchStore.browse(
      this.buildBrowseParams(this.plusPage())
    );

    if (id !== this.requestId) {
      return;
    }

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
      await this.refreshOwnedState();
    }

    return success;
  }

  public async removeSingle(gear: Gear): Promise<boolean> {
    // 제거는 SearchWarehouse가 확인 다이얼로그로 처리하며, 실제 제거는 비동기 onConfirm 이후 일어난다.
    // 반환 시점에는 아직 제거가 확정되지 않았으므로 여기서 배지를 갱신하지 않고,
    // 화면 복귀 시 useFocusEffect의 reload로 배지를 동기화한다(SR-1 패턴).
    return this.searchWarehouse.removeSingle(gear);
  }

  // 창고 추가/제거 후 보유 배지만 동기화한다.
  // 전체 reload(page 0 리셋)와 달리 이미 로드된 페이지 수를 유지해 스크롤 위치가 튀지 않는다.
  private async refreshOwnedState() {
    const loadedPages = this.page;

    if (loadedPages <= 0) {
      return;
    }

    const id = ++this.requestId;

    const responses = await Promise.all(
      Array.from({ length: loadedPages }, (_, pageIndex) =>
        this.searchStore.browse(this.buildBrowseParams(pageIndex))
      )
    );

    if (id !== this.requestId) {
      return;
    }

    const gears = responses.flatMap(response => response.gears);
    const hasMore = responses[responses.length - 1]?.hasMore ?? false;

    this.setResult(gears);
    this.setHasMore(hasMore);
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

  public getBrand() {
    return this.brand;
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
