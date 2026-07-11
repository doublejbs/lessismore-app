import { makeAutoObservable } from 'mobx';
import CampSiteType from './CampSiteType';
import { CampSpot } from './CampSpotTypes';
import CampSiteMapDispatcher from './CampSiteMapDispatcher';

// 박지 지도 화면(CS-1/CS-2)의 도메인 모델.
// /camp-spot 활성 문서를 로드해 유형 필터·선택 상태를 관리한다.
class CampSiteMap {
  public static new() {
    return new CampSiteMap(CampSiteMapDispatcher.new());
  }

  private spots: CampSpot[] = [];
  private loading = false;
  private loadError = false;
  // null = 전체(필터 없음).
  private selectedType: CampSiteType | null = null;
  private selectedSpot: CampSpot | null = null;
  private query = '';
  private initialized = false;

  // 검색 결과 상한(CS-6).
  private static readonly SEARCH_RESULT_LIMIT = 20;

  private constructor(private readonly dispatcher: CampSiteMapDispatcher) {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    this.setInitialized(true);

    await this.load();
  }

  public async retry() {
    await this.load();
  }

  private async load() {
    this.setLoading(true);
    this.setLoadError(false);

    try {
      const spots = await this.dispatcher.getActiveSpots();

      this.setSpots(spots);
    } catch (error) {
      console.error('박지 정보 로드 실패:', error);

      this.setLoadError(true);
    } finally {
      this.setLoading(false);
    }
  }

  // 선택된 유형 필터를 적용한 표시 대상 마커 목록.
  public getVisibleSpots(): CampSpot[] {
    if (this.selectedType === null) {
      return this.spots;
    }

    return this.spots.filter(spot => spot.type === this.selectedType);
  }

  // 검색어로 전체 spots를 필터한 결과(CS-6). 유형 필터(CS-2)와 독립.
  // trim이 비면 빈 배열, 아니면 name/region 부분일치(대소문자 무시) 최대 20건.
  public getSearchResults(): CampSpot[] {
    const keyword = this.query.trim().toLowerCase();

    if (keyword.length === 0) {
      return [];
    }

    const matched = this.spots.filter(spot => {
      const name = spot.name.toLowerCase();
      const region = spot.region.toLowerCase();

      return name.includes(keyword) || region.includes(keyword);
    });

    return matched.slice(0, CampSiteMap.SEARCH_RESULT_LIMIT);
  }

  public getQuery(): string {
    return this.query;
  }

  public setQuery(value: string) {
    this.query = value;
  }

  public clearQuery() {
    this.query = '';
  }

  public selectType(type: CampSiteType | null) {
    this.selectedType = type;
  }

  public selectSpot(spot: CampSpot | null) {
    this.selectedSpot = spot;
  }

  public getSelectedType(): CampSiteType | null {
    return this.selectedType;
  }

  public getSelectedSpot(): CampSpot | null {
    return this.selectedSpot;
  }

  public isLoading(): boolean {
    return this.loading;
  }

  public hasLoadError(): boolean {
    return this.loadError;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  private setSpots(value: CampSpot[]) {
    this.spots = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setLoadError(value: boolean) {
    this.loadError = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }
}

export default CampSiteMap;
