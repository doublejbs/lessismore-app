import { action, makeObservable, observable, reaction } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import Gear from '@/model/gear/Gear';
import BrowseSort from '@/model/search/BrowseSort';
import SearchStore from '@/model/search/SearchStore';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Firebase from '@/model/firebase/Firebase';
import GearStore from '@/model/store/GearStore';
import GearFilter from '@/model/gear/GearFilter';
import { getSelectableFineCategories } from '@/model/gear/GearCategoryGroups';
import OrderType from '@/model/order/OrderType';
import GearRowActions from '@/model/browse/GearRowActions';
import app from '@/model/app/App';
import FeedBucket, { FeedBucketKind } from './FeedBucket';
import { toBrandKey } from '@/model/store/BrandKey';
import {
  FeedBrandInterest,
  buildInterestProfile,
  isColdStartProfile,
} from './FeedInterestProfile';
import { createSeed, seededShuffle } from './SeededRandom';

// FD-1 기본 버킷 비율(개인화 4버킷 모드).
const WEIGHT_INTEREST_CATEGORY = 4;

const WEIGHT_INTEREST_BRAND = 2;

const WEIGHT_POPULAR = 2;

const WEIGHT_NEW_ARRIVAL = 2;

// FD-1 콜드스타트·필터 모드 비율(인기 6 : 신제품 4).
const WEIGHT_FILTER_POPULAR = 6;

const WEIGHT_FILTER_NEW_ARRIVAL = 4;

// FD-4: 장비 피드 도메인 모델. 버킷별 browse 쿼리를 병렬로 소싱하고 비율 기반 인터리브로 items를 구성한다.
// 결과 카드의 창고추가/제거/상세이동은 SearchWarehouse에 위임한다(Browse.ts 미러).
class Feed implements GearRowActions {
  public static new(router: ImperativeRouter) {
    const firebase = app.getFirebase();
    const searchStore = app.getSearchStore()!;
    const gearStore = app.getGearStore()!;
    const searchWarehouse = SearchWarehouse.new(router);

    return new Feed(
      router,
      firebase,
      searchStore,
      gearStore,
      searchWarehouse
    );
  }

  @observable private items: Gear[] = [];
  @observable private loading = false;
  @observable private refreshing = false;
  @observable private hasMore = true;
  @observable private initialized = false;
  @observable private filterCategory: string | null = null;
  // WH-2/FD-3 2차(세분) 카테고리 필터 — null이면 그룹 전체
  @observable private filterFineCategory: string | null = null;
  @observable private filterBrands: FeedBrandInterest[] = [];
  // FD-3 정렬: null=추천(개인화/필터 믹스), 그 외=해당 정렬 replica 단일 목록.
  @observable private sort: BrowseSort | null = null;

  private buckets: FeedBucket[] = [];
  private seed = createSeed();
  private interleaveRound = 0;
  private seenIds = new Set<string>();
  private topCategories: string[] = [];
  private topBrands: FeedBrandInterest[] = [];
  private coldStart = true;
  private requestId = 0;
  private disposeLoginReaction: () => void;

  protected constructor(
    private readonly navigation: ImperativeRouter,
    private readonly firebase: Firebase,
    private readonly searchStore: SearchStore,
    private readonly gearStore: GearStore,
    private readonly searchWarehouse: SearchWarehouse
  ) {
    makeObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.initializeProfileAndReload();
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
    await this.initializeProfileAndReload();
  }

  // 관심 프로필을 (로그인 시) 창고에서 재로딩한 뒤 첫 페이지를 다시 구성한다.
  private async initializeProfileAndReload() {
    await this.loadInterestProfile();
    await this.reload();
  }

  private async loadInterestProfile() {
    if (!this.firebase.isLoggedIn()) {
      this.topCategories = [];
      this.topBrands = [];
      this.coldStart = true;

      return;
    }

    try {
      const gears = await this.gearStore.getList(
        [GearFilter.All],
        OrderType.CreatedDesc
      );
      const profile = buildInterestProfile(gears);

      this.topCategories = profile.topCategories;
      this.topBrands = profile.topBrands;
      this.coldStart = isColdStartProfile(profile);
    } catch {
      this.topCategories = [];
      this.topBrands = [];
      this.coldStart = true;
    }
  }

  // 현재 모드(정렬/필터/콜드스타트/개인화)에 맞춰 버킷을 구성한다.
  private buildBuckets(): FeedBucket[] {
    // FD-3: 정렬이 지정되면(≠추천) 개인화·6:4 믹스를 하지 않고 단일 정렬 버킷을 쓴다.
    // 카테고리·브랜드 facet은 함께 적용한다.
    if (this.sort !== null) {
      return this.buildSortedBuckets(this.sort);
    }

    if (this.hasActiveFilter()) {
      return this.buildFilterBuckets();
    }

    if (this.coldStart) {
      return this.buildColdStartBuckets();
    }

    return this.buildPersonalizedBuckets();
  }

  // FD-3: 지정 정렬(인기/최신/가벼운/무거운) 단일 버킷. 카테고리·브랜드 facet 동시 적용.
  private buildSortedBuckets(sort: BrowseSort): FeedBucket[] {
    const category = this.getEffectiveFilterCategory() ?? undefined;
    const brands = this.toBrandNames(this.filterBrands);

    return [
      new FeedBucket({
        kind: FeedBucketKind.Popular,
        weight: WEIGHT_FILTER_POPULAR,
        sort,
        ...(category ? { category } : {}),
        ...(brands.length > 0 ? { brands } : {}),
      }),
    ];
  }

  private buildFilterBuckets(): FeedBucket[] {
    const category = this.getEffectiveFilterCategory() ?? undefined;
    // 선택 브랜드들의 표시명(companyKorean 우선)을 하나의 OR 그룹으로 넘긴다(FD-3).
    const brands = this.toBrandNames(this.filterBrands);

    return [
      new FeedBucket({
        kind: FeedBucketKind.Popular,
        weight: WEIGHT_FILTER_POPULAR,
        sort: BrowseSort.Popular,
        ...(category ? { category } : {}),
        ...(brands.length > 0 ? { brands } : {}),
      }),
      new FeedBucket({
        kind: FeedBucketKind.NewArrival,
        weight: WEIGHT_FILTER_NEW_ARRIVAL,
        sort: BrowseSort.Latest,
        ...(category ? { category } : {}),
        ...(brands.length > 0 ? { brands } : {}),
      }),
    ];
  }

  // 관심/필터 브랜드를 browse용 표시명 배열로 변환한다(빈 값 제외).
  private toBrandNames(brands: FeedBrandInterest[]): string[] {
    return brands
      .map(brand => brand.companyKorean || brand.company)
      .filter(name => name.length > 0);
  }

  private buildColdStartBuckets(): FeedBucket[] {
    return [
      new FeedBucket({
        kind: FeedBucketKind.Popular,
        weight: WEIGHT_FILTER_POPULAR,
        sort: BrowseSort.Popular,
      }),
      new FeedBucket({
        kind: FeedBucketKind.NewArrival,
        weight: WEIGHT_FILTER_NEW_ARRIVAL,
        sort: BrowseSort.Latest,
      }),
    ];
  }

  private buildPersonalizedBuckets(): FeedBucket[] {
    const buckets: FeedBucket[] = [];

    // 관심 카테고리(상위 2)는 그룹 가중치 4를 카테고리별로 균등 분배한다.
    if (this.topCategories.length > 0) {
      const perCategory = Math.max(
        1,
        Math.floor(WEIGHT_INTEREST_CATEGORY / this.topCategories.length)
      );

      this.topCategories.forEach(category => {
        buckets.push(
          new FeedBucket({
            kind: FeedBucketKind.InterestCategory,
            weight: perCategory,
            sort: BrowseSort.Popular,
            category,
          })
        );
      });
    }

    // 관심 브랜드(상위 2)는 그룹 가중치 2를 브랜드별로 균등 분배한다.
    if (this.topBrands.length > 0) {
      const perBrand = Math.max(
        1,
        Math.floor(WEIGHT_INTEREST_BRAND / this.topBrands.length)
      );

      this.topBrands.forEach(brand => {
        const brandName = brand.companyKorean || brand.company;

        if (brandName) {
          buckets.push(
            new FeedBucket({
              kind: FeedBucketKind.InterestBrand,
              weight: perBrand,
              sort: BrowseSort.Popular,
              brands: [brandName],
            })
          );
        }
      });
    }

    buckets.push(
      new FeedBucket({
        kind: FeedBucketKind.Popular,
        weight: WEIGHT_POPULAR,
        sort: BrowseSort.Popular,
      })
    );
    buckets.push(
      new FeedBucket({
        kind: FeedBucketKind.NewArrival,
        weight: WEIGHT_NEW_ARRIVAL,
        sort: BrowseSort.Latest,
      })
    );

    return buckets;
  }

  public async reload() {
    const id = ++this.requestId;

    this.setLoading(true);
    // 필터·정렬 변경 시 기존 목록을 비워 스켈레톤을 노출하고, 새 목록은 최상단부터 렌더한다
    // (FlatList가 리마운트되어 스크롤이 맨 위로 리셋된다). 당겨서 새로고침(refresh)은 이 경로를 쓰지 않는다.
    this.setItems([]);
    this.resetPagingState();
    this.buckets = this.buildBuckets();

    const interleaved = await this.fetchAndInterleave(id);

    if (id !== this.requestId) {
      return;
    }

    this.setItems(interleaved);
    this.setHasMore(this.computeHasMore());
    this.setLoading(false);
  }

  public async refresh() {
    const id = ++this.requestId;

    this.setRefreshing(true);
    this.seed = createSeed();
    this.resetPagingState();
    this.buckets = this.buildBuckets();

    const interleaved = await this.fetchAndInterleave(id);

    if (id !== this.requestId) {
      return;
    }

    this.setItems(interleaved);
    this.setHasMore(this.computeHasMore());
    this.setRefreshing(false);
  }

  public async loadMore() {
    if (!this.hasMore || this.loading || this.refreshing) {
      return;
    }

    const id = ++this.requestId;

    this.setLoading(true);

    const interleaved = await this.fetchAndInterleave(id);

    if (id !== this.requestId) {
      return;
    }

    this.appendItems(interleaved);
    this.setHasMore(this.computeHasMore());
    this.setLoading(false);
  }

  // FD-3 `확인`: 스테이징된 정렬·카테고리·브랜드를 원자적으로 적용한다.
  // 현재 적용값과 얕은 비교로 동일하면 reload를 생략한다(변경 없으면 no-op).
  public async setFilters(
    category: string | null,
    brands: FeedBrandInterest[],
    sort: BrowseSort | null
  ) {
    if (this.isSameFilters(category, brands, sort)) {
      return;
    }

    this.setFilterValues(category, brands, sort);
    await this.reload();
  }

  // FD-3 상단 바 즉시 적용 — 현재 카테고리·브랜드는 유지하고 정렬만 교체한다.
  public async selectSort(sort: BrowseSort | null) {
    await this.setFilters(this.filterCategory, this.filterBrands, sort);
  }

  // FD-3 상단 바 즉시 적용 — 현재 정렬·브랜드는 유지하고 카테고리만 교체한다(재탭/`전체` 해제는 호출측에서 null 전달).
  public async selectCategory(category: string | null) {
    // 1차 카테고리 변경 시 2차(세분) 선택은 초기화한다.
    this.setFilterFineCategory(null);
    await this.setFilters(category, this.filterBrands, this.sort);
  }

  // FD-3 2차(세분) 카테고리 선택 — 같은 키 재선택이면 그룹 전체(null)로 토글. 재조회로 facet 반영.
  public async selectFineCategory(key: string | null) {
    const next = key !== null && key === this.filterFineCategory ? null : key;

    if (next === this.filterFineCategory) {
      return;
    }

    this.setFilterFineCategory(next);
    await this.reload();
  }

  // FD-3 브랜드 시트 `확인` — 현재 정렬·카테고리는 유지하고 브랜드만 교체한다.
  public async applyBrands(brands: FeedBrandInterest[]) {
    await this.setFilters(this.filterCategory, brands, this.sort);
  }

  // 각 버킷의 다음 페이지를 병렬 로드하고(hasMore·큐 잔량 고려) 비율 기반 인터리브를 수행한다.
  private async fetchAndInterleave(id: number): Promise<Gear[]> {
    await this.fetchNextPages(id);

    if (id !== this.requestId) {
      return [];
    }

    return this.interleave();
  }

  // 큐가 비었고 아직 페이지가 남은 버킷만 병렬로 다음 페이지를 가져온다.
  private async fetchNextPages(id: number) {
    const targets = this.buckets.filter(
      bucket => !bucket.hasQueued() && bucket.canFetchMore()
    );

    if (targets.length === 0) {
      return;
    }

    const responses = await Promise.all(
      targets.map(async bucket => {
        try {
          const response = await this.searchStore.browse(
            bucket.buildBrowseParams()
          );

          return { bucket, response };
        } catch {
          return {
            bucket,
            response: { gears: [] as Gear[], hasMore: false },
          };
        }
      })
    );

    if (id !== this.requestId) {
      return;
    }

    responses.forEach(({ bucket, response }) => {
      bucket.advancePage();
      bucket.setHasMore(response.hasMore);
      bucket.enqueue(this.filterCandidates(response.gears));
    });
  }

  // 제외 규칙 적용: 보유 장비, 이미 노출된 id 중복.
  // 장비 이미지 미제공 원칙(DataModel §1)으로 imageUrl 유효성 제외는 없다 — 카탈로그 전체가 후보(FD-1).
  private filterCandidates(gears: Gear[]): Gear[] {
    const result: Gear[] = [];

    gears.forEach(gear => {
      if (gear.isAdded()) {
        return;
      }

      if (this.seenIds.has(gear.getId())) {
        return;
      }

      result.push(gear);
    });

    return result;
  }

  // 비율(버킷 weight) 기반 라운드 로빈 인터리브. 라운드마다 시드로 버킷 순서를 흔든다.
  private interleave(): Gear[] {
    const output: Gear[] = [];
    let progressed = true;

    while (progressed) {
      progressed = false;

      const roundBuckets = seededShuffle(
        this.buckets,
        this.seed,
        this.interleaveRound
      );

      roundBuckets.forEach(bucket => {
        const taken = bucket.dequeue(bucket.weight);

        taken.forEach(gear => {
          if (!this.seenIds.has(gear.getId())) {
            this.seenIds.add(gear.getId());
            output.push(gear);
          }
        });

        if (taken.length > 0) {
          progressed = true;
        }
      });

      this.interleaveRound += 1;
    }

    return output;
  }

  private computeHasMore(): boolean {
    return this.buckets.some(
      bucket => bucket.hasQueued() || bucket.canFetchMore()
    );
  }

  public async registerSingle(gear: Gear): Promise<boolean> {
    // FD-2: 담기 후에도 items를 리셋하지 않아 스크롤 위치를 유지한다.
    // 등록 완료 후 보유 배지만 재동기화한다(전체 reload 금지).
    return this.searchWarehouse.registerSingle(gear, () =>
      this.refreshOwnedState()
    );
  }

  public async removeSingle(gear: Gear): Promise<boolean> {
    // 제거는 SearchWarehouse가 확인 다이얼로그로 처리하며 실제 제거는 비동기 onConfirm 이후 일어난다(Browse.ts 참고).
    // Browse는 화면 복귀 시 focus reload로 배지를 맞추지만 피드는 focus reload가 없어,
    // 제거 확정 콜백에서 보유 배지만 재동기화한다(전체 reload 금지, 스크롤 유지).
    return this.searchWarehouse.removeSingle(gear, () =>
      this.refreshOwnedState()
    );
  }

  // 창고 추가/제거 후 현재 items의 보유(added) 배지만 동기화한다.
  // 페이지 재fetch 대신 창고 보유 id 집합을 다시 읽어, added만 갱신된 새 Gear 인스턴스로 in-place 교체한다.
  // items 배열 길이·순서를 유지하므로 스크롤 위치가 튀지 않는다(FD-2).
  private async refreshOwnedState() {
    if (this.items.length === 0) {
      return;
    }

    const id = ++this.requestId;
    const ownedIds = await this.loadOwnedIds();

    if (id !== this.requestId) {
      return;
    }

    const synced = this.items.map(gear =>
      this.withOwnedState(gear, ownedIds.has(gear.getId()))
    );

    this.setItems(synced);
  }

  // 창고 보유 장비 id 집합을 읽는다. 비로그인·오류 시 빈 집합.
  private async loadOwnedIds(): Promise<Set<string>> {
    if (!this.firebase.isLoggedIn()) {
      return new Set<string>();
    }

    try {
      const owned = await this.gearStore.getList(
        [GearFilter.All],
        OrderType.CreatedDesc
      );

      return new Set(owned.map(gear => gear.getId()));
    } catch {
      return new Set<string>();
    }
  }

  // added만 바뀐 새 Gear 인스턴스를 만든다(Gear에 mutator를 두지 않기 위함).
  private withOwnedState(gear: Gear, added: boolean): Gear {
    if (gear.isAdded() === added) {
      return gear;
    }

    return new Gear(
      gear.getId(),
      gear.getName(),
      gear.getCompany(),
      gear.getWeight(),
      added,
      gear.getIsCustom(),
      gear.getCategory(),
      gear.getUseless(),
      gear.getUsed(),
      gear.getBags(),
      gear.getCreateDate(),
      gear.getColor(),
      gear.getCompanyKorean(),
      gear.getNameKorean(),
      gear.getExtra()
    );
  }

  public goToGearDetail(gear: Gear) {
    this.navigation.push(`/gear-detail/${gear.getId()}`);
  }

  public getItems() {
    return this.items;
  }

  public getFilterCategory() {
    return this.filterCategory;
  }

  public getFilterFineCategory() {
    return this.filterFineCategory;
  }

  // facet에 넘길 실질 카테고리 — 세분 선택 시 세분 키, 아니면 그룹 키.
  public getEffectiveFilterCategory() {
    return this.filterFineCategory ?? this.filterCategory;
  }

  // 선택된 1차 그룹의 세분 옵션. 전체이거나 멤버 2개 미만이면 빈 배열(세분 행 미표시).
  public getFineCategoryOptions(): string[] {
    if (this.filterCategory === null) {
      return [];
    }

    // 라벨 없는 레거시 키를 빼고 센다 — 그대로 넘기면 빈 칩이 생긴다(DM-4).
    const members = getSelectableFineCategories(
      this.filterCategory as GearFilter
    );

    if (members.length < 2) {
      return [];
    }

    return members;
  }

  public getFilterBrands() {
    return this.filterBrands;
  }

  // 검색 승계(SR-1)용 — 현재 필터 브랜드를 facet 매칭용 표시명 배열로 반환한다.
  public getFilterBrandNames() {
    return this.toBrandNames(this.filterBrands);
  }

  // FD-3 정렬 상태(null=추천). 시트가 열릴 때 스테이징 초기값으로 읽는다.
  public getSort() {
    return this.sort;
  }

  public hasActiveFilter() {
    return this.filterCategory !== null || this.filterBrands.length > 0;
  }

  public getActiveFilterCount() {
    let count = 0;

    if (this.filterCategory !== null) {
      count += 1;
    }

    count += this.filterBrands.length;

    return count;
  }

  // FD-3 `초기화`: 정렬(추천)·카테고리·브랜드 필터를 모두 해제하고 피드를 재구성한다(중복 reload 방지).
  public async resetFilters() {
    if (!this.hasActiveFilter() && this.sort === null) {
      return;
    }

    this.setFilterFineCategory(null);
    this.setFilterValues(null, [], null);
    await this.reload();
  }

  public isLoading() {
    return this.loading;
  }

  public isRefreshing() {
    return this.refreshing;
  }

  public canLoadMore() {
    return this.hasMore;
  }

  public isEmpty() {
    return !this.items.length;
  }

  public isInitialized() {
    return this.initialized;
  }

  // 적용값과 후보값이 같은지 얕게 비교한다(정렬 동일 + 카테고리 동일 + 브랜드 집합 동일, 순서 무관).
  private isSameFilters(
    category: string | null,
    brands: FeedBrandInterest[],
    sort: BrowseSort | null
  ): boolean {
    if (this.sort !== sort) {
      return false;
    }

    if (this.filterCategory !== category) {
      return false;
    }

    if (this.filterBrands.length !== brands.length) {
      return false;
    }

    const currentKeys = new Set(
      this.filterBrands.map(brand =>
        toBrandKey(brand.companyKorean, brand.company)
      )
    );

    return brands.every(brand =>
      currentKeys.has(toBrandKey(brand.companyKorean, brand.company))
    );
  }

  private resetPagingState() {
    this.interleaveRound = 0;
    this.seenIds = new Set<string>();
    this.buckets.forEach(bucket => bucket.reset());
  }

  @action
  private setItems(value: Gear[]) {
    this.items = value;
  }

  @action
  private appendItems(value: Gear[]) {
    this.items.push(...value);
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  @action
  private setRefreshing(value: boolean) {
    this.refreshing = value;
  }

  @action
  private setHasMore(value: boolean) {
    this.hasMore = value;
  }

  @action
  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  @action
  private setFilterValues(
    category: string | null,
    brands: FeedBrandInterest[],
    sort: BrowseSort | null
  ) {
    this.filterCategory = category;
    this.filterBrands = brands;
    this.sort = sort;
  }

  @action
  private setFilterFineCategory(value: string | null) {
    this.filterFineCategory = value;
  }
}

export default Feed;
