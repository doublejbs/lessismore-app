import { action, makeObservable, observable } from 'mobx';
import { Router } from 'expo-router';
import Gear from '@/model/gear/Gear';
import SearchStore from '@/model/search/SearchStore';
import BrandRankStore, { BrandRankData } from '@/model/search/BrandRankStore';
import GearFilter from '@/model/gear/GearFilter';
import BrowseSort from '@/model/search/BrowseSort';
import app from '@/model/app/App';

const NEW_ARRIVAL_COUNT = 20;
const BRAND_PREVIEW_COUNT = 5;

// SR-6 탐색 홈에서 신제품 캐러셀·인기 브랜드 미리보기 데이터를 담당하는 모델.
// 인기 장비 순위(SR-4)는 기존 SearchRank/SearchTopKeywordsView가 그대로 담당한다.
class BrowseHome {
  public static new(router: Router) {
    const searchStore = app.getSearchStore()!;
    const brandRankStore = new BrandRankStore(app.getFirebase());

    return new BrowseHome(router, searchStore, brandRankStore);
  }

  @observable private newArrivals: Gear[] = [];
  @observable private brands: BrandRankData[] = [];
  @observable private loading = false;
  @observable private loaded = false;

  protected constructor(
    private readonly navigation: Router,
    private readonly searchStore: SearchStore,
    private readonly brandRankStore: BrandRankStore
  ) {
    makeObservable(this);
  }

  public async load() {
    if (this.loaded) {
      return;
    }

    this.setLoading(true);

    const [newArrivals, brands] = await Promise.all([
      this.searchStore.getNewArrivals(NEW_ARRIVAL_COUNT),
      this.brandRankStore.loadBrands(BRAND_PREVIEW_COUNT),
    ]);

    this.setNewArrivals(newArrivals);
    this.setBrands(brands);
    this.setLoading(false);
    this.setLoaded(true);
  }

  public goToCategory(category: GearFilter) {
    this.navigation.push(`/browse?category=${category}&sort=popular`);
  }

  public goToBrandDirectory() {
    this.navigation.push('/brand-directory');
  }

  public goToBrandList(brand: BrandRankData) {
    const company = brand.companyKorean || brand.company;

    this.navigation.push(
      `/browse?brand=${encodeURIComponent(company)}&sort=popular`
    );
  }

  public goToNewArrivalsAll() {
    this.navigation.push(`/browse?sort=${BrowseSort.Latest}`);
  }

  public goToGearDetail(gear: Gear) {
    this.navigation.push(`/gear-detail/${gear.getId()}`);
  }

  public getNewArrivals() {
    return this.newArrivals;
  }

  public getBrands() {
    return this.brands;
  }

  public isLoading() {
    return this.loading;
  }

  @action
  private setNewArrivals(value: Gear[]) {
    this.newArrivals = value;
  }

  @action
  private setBrands(value: BrandRankData[]) {
    this.brands = value;
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  @action
  private setLoaded(value: boolean) {
    this.loaded = value;
  }
}

export default BrowseHome;
