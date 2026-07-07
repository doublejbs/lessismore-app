import { action, makeObservable, observable, reaction } from 'mobx';
import { Router } from 'expo-router';
import Gear from '@/model/gear/Gear';
import BrowseSort from '@/model/search/BrowseSort';
import SearchStore from '@/model/search/SearchStore';
import SearchWarehouse from '@/model/search/SearchWarehouse';
import Firebase from '@/model/firebase/Firebase';
import GearStore from '@/model/store/GearStore';
import GearFilter from '@/model/gear/GearFilter';
import OrderType from '@/model/order/OrderType';
import GearRowActions from '@/model/browse/GearRowActions';
import app from '@/model/app/App';
import FeedBucket, { FeedBucketKind } from './FeedBucket';
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
  public static new(router: Router) {
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
  @observable private filterBrand: FeedBrandInterest | null = null;

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
    private readonly navigation: Router,
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

  // 현재 모드(필터/콜드스타트/개인화)에 맞춰 버킷을 구성한다.
  private buildBuckets(): FeedBucket[] {
    const hasFilter = this.filterCategory !== null || this.filterBrand !== null;

    if (hasFilter) {
      return this.buildFilterBuckets();
    }

    if (this.coldStart) {
      return this.buildColdStartBuckets();
    }

    return this.buildPersonalizedBuckets();
  }

  private buildFilterBuckets(): FeedBucket[] {
    const category = this.filterCategory ?? undefined;
    const brand = this.filterBrand
      ? this.filterBrand.companyKorean || this.filterBrand.company
      : undefined;

    return [
      new FeedBucket({
        kind: FeedBucketKind.Popular,
        weight: WEIGHT_FILTER_POPULAR,
        sort: BrowseSort.Popular,
        ...(category ? { category } : {}),
        ...(brand ? { brand } : {}),
      }),
      new FeedBucket({
        kind: FeedBucketKind.NewArrival,
        weight: WEIGHT_FILTER_NEW_ARRIVAL,
        sort: BrowseSort.Latest,
        ...(category ? { category } : {}),
        ...(brand ? { brand } : {}),
      }),
    ];
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
              brand: brandName,
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

  public async setFilterCategory(category: string | null) {
    if (this.filterCategory === category) {
      return;
    }

    this.setFilterCategoryValue(category);
    await this.reload();
  }

  public async setFilterBrand(brand: FeedBrandInterest | null) {
    if (this.isSameBrand(this.filterBrand, brand)) {
      return;
    }

    this.setFilterBrandValue(brand);
    await this.reload();
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

  // 제외 규칙 적용: 보유 장비, imageUrl 무효, 이미 노출된 id 중복.
  private filterCandidates(gears: Gear[]): Gear[] {
    const result: Gear[] = [];

    gears.forEach(gear => {
      if (gear.isAdded()) {
        return;
      }

      if (!gear.getImageUrl()) {
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
      gear.getImageUrl(),
      added,
      gear.getIsCustom(),
      gear.getCategory(),
      gear.getUseless(),
      gear.getUsed(),
      gear.getBags(),
      gear.getCreateDate(),
      gear.getColor(),
      gear.getCompanyKorean(),
      gear.getNameKorean()
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

  public getFilterBrand() {
    return this.filterBrand;
  }

  public hasActiveFilter() {
    return this.filterCategory !== null || this.filterBrand !== null;
  }

  public getActiveFilterCount() {
    let count = 0;

    if (this.filterCategory !== null) {
      count += 1;
    }

    if (this.filterBrand !== null) {
      count += 1;
    }

    return count;
  }

  // FD-3 `초기화`: 카테고리·브랜드 필터를 모두 해제하고 피드를 재구성한다(중복 reload 방지).
  public async resetFilters() {
    if (!this.hasActiveFilter()) {
      return;
    }

    this.setFilterCategoryValue(null);
    this.setFilterBrandValue(null);
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

  private isSameBrand(
    left: FeedBrandInterest | null,
    right: FeedBrandInterest | null
  ): boolean {
    if (left === null && right === null) {
      return true;
    }

    if (left === null || right === null) {
      return false;
    }

    return (
      left.companyKorean === right.companyKorean &&
      left.company === right.company
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
  private setFilterCategoryValue(value: string | null) {
    this.filterCategory = value;
  }

  @action
  private setFilterBrandValue(value: FeedBrandInterest | null) {
    this.filterBrand = value;
  }
}

export default Feed;
