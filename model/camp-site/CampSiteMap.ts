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
  private initialized = false;

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
