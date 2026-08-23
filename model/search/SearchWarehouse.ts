import Gear from '@/model/gear/Gear';
import { action, makeObservable, observable, reaction } from 'mobx';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import { ImperativeRouter } from 'expo-router';
import app from '@/model/app/App';
import SearchDispatcherType from '@/model/search/SearchDispatcherType';
import SearchDispatcher from '@/model/search/SearchDispatcher';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';
import BagDetail from '../bag-detail/BagDetail';
import GearRankStore from './GearRankStore';
import SearchRank from './SearchRank';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';

class SearchWarehouse {
  public static new(router: ImperativeRouter) {
    const firebase = app.getFirebase();
    const gearRankStore = new GearRankStore(firebase);
    const searchDispatcher = SearchDispatcher.new();
    const logInAlertManager = app.getLogInAlertManager()!;
    const warehouseOrder = Order.new(Warehouse.ORDER_KEY);
    const bagDetailOrder = Order.new(BagDetail.ORDER_KEY);
    const alertManager = app.getAlertManager()!;
    const toastManager = app.getToastManager()!;

    return new SearchWarehouse(
      searchDispatcher,
      router,
      firebase,
      logInAlertManager,
      warehouseOrder,
      bagDetailOrder,
      new SearchRank(
        gearRankStore,
        searchDispatcher,
        firebase,
        logInAlertManager,
        warehouseOrder,
        bagDetailOrder,
        alertManager,
        toastManager,
        router
      ),
      alertManager,
      toastManager
    );
  }

  @observable private keyword: string = '';
  @observable private result: Gear[] = [];
  @observable private selected: Gear[] = [];
  @observable private loading = false;
  /**
   * 디바운스 대기 중(입력했지만 아직 검색을 시작하지 않은 상태).
   *
   * `loading`과 갈라 두는 이유는 **빈 상태 문구의 조건**이다. 대기 중에도 결과는 비어 있을 수
   * 있는데 그때 `검색 결과가 없습니다`를 띄우면, 300ms마다 문구 ↔ 스켈레톤이 번갈아 뜬다.
   */
  @observable private pending = false;
  @observable private hasMore = false;
  @observable private topSearches: string[] = [];
  @observable private loadingTopSearches = false;
  private page = 0;
  /**
   * 응답 도착 순서를 보장하기 위한 요청 일련번호.
   *
   * 타이핑 중에는 검색이 여러 개 겹치는데(디바운스 + 포커스 재검색 + 등록 후 재검색) 응답이
   * 보낸 순서대로 오지 않는다. 번호가 최신이 아닌 응답은 **결과·로딩 플래그를 건드리지 않고
   * 버린다** — 예전 응답이 늦게 도착해 최신 결과를 덮어쓰거나, 아직 검색 중인데 로딩을 끄는
   * 것이 문구 깜빡임의 직접 원인이었다.
   */
  private searchSeq = 0;
  private disposeLoginReaction: () => void;
  private debounceTimer: NodeJS.Timeout | null = null;
  // 검색 승계(SR-1) — 탐색 탭이 피드 필터(카테고리·브랜드)를 주입한다. 없으면 필터 없이 검색.
  private searchFilterProvider:
    (() => { category?: string; brands?: string[] }) | null = null;

  protected constructor(
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly navigation: ImperativeRouter,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order,
    private readonly searchRank: SearchRank,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
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
      this.setPending(false);
    }
  }

  public changeKeyword(keyword: string) {
    this.setLoading(true);
    this.setPending(true);
    this.setKeyword(keyword);

    // **직전 결과를 비우지 않는다.** 글자마다 비우면 300ms 동안 목록이 사라져 스켈레톤이
    // 깜빡이고, 그 사이 응답이 0건이면 빈 상태 문구까지 스친다. 새 결과가 도착할 때 교체한다.

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;

      if (this.getKeyword()) {
        app
          .getAnalyticsManager()
          ?.logEvent('search', { search_term: this.getKeyword() });
      }

      this.executeSearch().finally(() => {
        this.setPending(false);
      });
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

  public setSearchFilterProvider(
    provider: (() => { category?: string; brands?: string[] }) | null
  ) {
    this.searchFilterProvider = provider;
  }

  public async searchMore() {
    if (this.hasMore) {
      this.setLoading(true);

      if (this.getKeyword()) {
        const { gears, hasMore } = await this.searchDispatcher.searchList(
          this.getKeyword(),
          this.plusPage(),
          this.searchFilterProvider?.()
        );

        this.appendResult(gears);
        this.setHasMore(hasMore);
      } else {
        this.setResult([]);
      }
      this.setLoading(false);
    }
  }

  public async executeSearch() {
    const seq = ++this.searchSeq;

    this.setLoading(true);
    this.clearPage();

    if (this.getKeyword()) {
      const { gears, hasMore } = await this.searchDispatcher.searchList(
        this.getKeyword(),
        this.plusPage(),
        this.searchFilterProvider?.()
      );

      // 더 최신 검색이 시작됐으면 이 응답은 버린다(위 `searchSeq` 주석).
      if (seq !== this.searchSeq) {
        return;
      }

      this.setResult(gears);
      this.setHasMore(hasMore);
    } else {
      if (seq !== this.searchSeq) {
        return;
      }

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

  @action
  private setPending(value: boolean) {
    this.pending = value;
  }

  /**
   * 검색이 끝나 결과를 신뢰할 수 있는 상태인지.
   *
   * `검색 결과가 없습니다`는 이 값이 참일 때만 띄운다 — 디바운스 대기 중이거나 요청이
   * 진행 중이면 결과가 비어 있는 것이 "없다"는 뜻이 아니다.
   */
  public isSettled() {
    return !this.loading && !this.pending;
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
    this.setPending(false);
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

  // onRegistered는 창고 등록이 실제로 완료된 뒤 호출된다(피드 배지 재동기화용).
  public async registerSingle(
    gear: Gear,
    onRegistered?: () => void | Promise<void>
  ): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 결과 목록에서 해당 gear의 isAdded 상태를 업데이트하기 위해 재검색
    await this.executeSearch();
    await onRegistered?.();

    return true;
  }

  // 제거는 확인 다이얼로그 이후 비동기로 일어난다.
  // onRemoved는 실제 제거가 확정된 시점(onConfirm 완료 후)에 호출된다(피드 배지 재동기화용).
  public async removeSingle(
    gear: Gear,
    onRemoved?: () => void | Promise<void>
  ): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    this.alertManager.show({
      message: app.getL10n().t('search.removeConfirm'),
      confirmText: app.getL10n().t('common.confirm'),
      onConfirm: async () => {
        await this.searchDispatcher.remove(gear);
        await this.warehouseOrder.saveLastOrderOption();
        await this.bagDetailOrder.saveLastOrderOption();

        // 결과 목록에서 해당 gear의 isAdded 상태를 업데이트하기 위해 재검색
        await this.executeSearch();
        await onRemoved?.();
        this.toastManager.show({
          message: app.getL10n().t('search.removed'),
        });
      },
    });

    return true;
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

  public getSearchRank() {
    return this.searchRank;
  }

  public goToGearDetail(gear: Gear) {
    this.navigation.push(`/gear-detail/${gear.getId()}`);
  }
}

export default SearchWarehouse;
