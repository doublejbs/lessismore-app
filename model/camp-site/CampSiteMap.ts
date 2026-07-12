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
  // 검색 인풋 포커스 여부 — 드롭다운은 query가 있고 포커스 상태일 때만 표시(CS-6).
  // 검색 오버레이 컴포넌트와 지도 탭 핸들러가 함께 쓰므로 모델이 들고 있는다.
  private searchFocused = false;
  private initialized = false;

  // 검색 결과 상한(CS-6).
  private static readonly SEARCH_RESULT_LIMIT = 20;

  // 줌아웃 상태에서 표시할 샘플 마커 상한(CS-2).
  private static readonly MAX_ZOOMED_OUT_MARKERS = 30;

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

  // 유형 필터 적용 후 화면 영역(region) 안에 있는 spots(CS-2).
  // 줌인 상태 마커는 전체가 아니라 이 목록만 그린다 — 전량(400+)을 네이티브 마커로
  // 올리면 커스텀 뷰 캡처·캡션 충돌 계산이 무거워 탭 반응이 눈에 띄게 느려진다.
  public getSpotsInRegion(region: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  }): CampSpot[] {
    return this.getVisibleSpots().filter(spot => {
      const { latitude, longitude } = spot.location;

      return (
        latitude >= region.minLatitude &&
        latitude <= region.maxLatitude &&
        longitude >= region.minLongitude &&
        longitude <= region.maxLongitude
      );
    });
  }

  // 줌아웃 상태에서 표시할 샘플 마커(CS-2). 현재 화면 영역(region) 안의 spots를
  // 세로 6분할 격자 셀당 1개 우선으로 분산시키고, 상한이 남으면 순서대로 보충한다.
  public getSampledSpots(region: {
    minLatitude: number;
    maxLatitude: number;
    minLongitude: number;
    maxLongitude: number;
  }): CampSpot[] {
    const spots = this.getSpotsInRegion(region);

    // 화면 높이(위도 스팬)를 6분할한 셀 크기. 0 이하일 땐 최소 0.01로 방어한다.
    const cellSize = Math.max(
      (region.maxLatitude - region.minLatitude) / 6,
      0.01
    );
    const picked = new Map<string, CampSpot>();

    for (const spot of spots) {
      const key = `${Math.floor(spot.location.latitude / cellSize)}:${Math.floor(spot.location.longitude / cellSize)}`;

      if (!picked.has(key)) {
        picked.set(key, spot);
      }
    }

    const sampled = Array.from(picked.values());

    if (sampled.length < CampSiteMap.MAX_ZOOMED_OUT_MARKERS) {
      const chosen = new Set(sampled.map(spot => spot.id));

      for (const spot of spots) {
        if (sampled.length >= CampSiteMap.MAX_ZOOMED_OUT_MARKERS) {
          break;
        }

        if (!chosen.has(spot.id)) {
          sampled.push(spot);
        }
      }
    }

    return sampled.slice(0, CampSiteMap.MAX_ZOOMED_OUT_MARKERS);
  }

  public getQuery(): string {
    return this.query;
  }

  public setSearchFocused(value: boolean) {
    this.searchFocused = value;
  }

  public isSearchFocused(): boolean {
    return this.searchFocused;
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
