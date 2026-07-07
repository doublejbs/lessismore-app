import { action, makeObservable, observable } from 'mobx';
import { Router } from 'expo-router';
import BrandRankStore, { BrandRankData } from '@/model/search/BrandRankStore';
import app from '@/model/app/App';

// SR-8 브랜드 디렉토리 화면의 도메인 모델.
class BrandDirectory {
  public static new(router: Router) {
    const brandRankStore = new BrandRankStore(app.getFirebase());

    return new BrandDirectory(router, brandRankStore);
  }

  @observable private brands: BrandRankData[] = [];
  @observable private loading = false;
  @observable private initialized = false;
  @observable private keyword: string = '';

  protected constructor(
    private readonly navigation: Router,
    private readonly brandRankStore: BrandRankStore
  ) {
    makeObservable(this);
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    this.setInitialized(true);
    await this.loadBrands();
  }

  public async loadBrands() {
    this.setLoading(true);
    const brands = await this.brandRankStore.loadBrands();
    this.setBrands(brands);
    this.setLoading(false);
  }

  public goToBrandList(brand: BrandRankData) {
    const company = brand.companyKorean || brand.company;

    this.navigation.push(
      `/browse?brand=${encodeURIComponent(company)}&sort=popular`
    );
  }

  public getBrands() {
    const q = this.keyword.trim().toLowerCase();

    if (!q) {
      return this.brands;
    }

    return this.brands.filter((brand) => {
      const koreanMatch = (brand.companyKorean || '').toLowerCase().includes(q);
      const englishMatch = (brand.company || '').toLowerCase().includes(q);

      return koreanMatch || englishMatch;
    });
  }

  public isLoading() {
    return this.loading;
  }

  public isEmpty() {
    return !this.getBrands().length;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getKeyword() {
    return this.keyword;
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
  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  @action
  public changeKeyword(keyword: string) {
    this.keyword = keyword;
  }

  @action
  public clearKeyword() {
    this.keyword = '';
  }
}

export default BrandDirectory;
