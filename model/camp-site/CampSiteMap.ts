import { makeAutoObservable } from 'mobx';
import app from '../app/App';
import CampSiteType from './CampSiteType';
import CampSiteTag from './CampSiteTag';
import { CampSpot } from './CampSpotTypes';
import { getCampSiteTagLabel, getCampSpotRegionLabel } from './CampSiteLabels';
import CampSiteMapDispatcher from './CampSiteMapDispatcher';
import CampFavoriteStore from '../store/CampFavoriteStore';

// 박지 지도 화면(CS-1/CS-2)의 도메인 모델.
// /camp-spot 활성 문서를 로드해 유형 필터·선택 상태를 관리한다.
class CampSiteMap {
  public static new() {
    return new CampSiteMap(
      CampSiteMapDispatcher.new(),
      app.getCampFavoriteStore()!
    );
  }

  private spots: CampSpot[] = [];
  private loading = false;
  private loadError = false;
  // null = 전체(필터 없음).
  private selectedType: CampSiteType | null = null;
  // 태그 필터(CS-2) — 유형 필터와 AND 결합. null = 전체.
  private selectedTag: CampSiteTag | null = null;
  private selectedSpot: CampSpot | null = null;
  // 즐겨찾기 리스트 시트(CS-9)가 열려 있는 동안 지도에 즐겨찾기 마커만 표시하는 필터.
  // 시트가 열리면 true, 닫히면 false로 되돌린다. 유형·태그 필터와 AND 결합한다.
  private favoriteOnly = false;
  private query = '';
  // 검색 인풋 포커스 여부 — 드롭다운은 query가 있고 포커스 상태일 때만 표시(CS-6).
  // 검색 오버레이 컴포넌트와 지도 탭 핸들러가 함께 쓰므로 모델이 들고 있는다.
  private searchFocused = false;
  private initialized = false;

  // 검색 결과 상한(CS-6).
  private static readonly SEARCH_RESULT_LIMIT = 20;

  private constructor(
    private readonly dispatcher: CampSiteMapDispatcher,
    private readonly favoriteStore: CampFavoriteStore
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.loading || (this.initialized && !this.loadError)) {
      return;
    }

    this.setInitialized(true);

    // 즐겨찾기 목록은 로그인 사용자만 1회 로드한다(CS-9). 스팟 로드와 병렬로 진행한다.
    void this.favoriteStore.load();

    await this.load();
  }

  public async retry() {
    await this.load();
  }

  private async load() {
    if (this.loading) {
      return;
    }

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

  // 선택된 유형·태그 필터(AND)를 적용한 표시 대상 마커 목록.
  // 태그 필터 선택 시 태그 미부여 spot은 제외된다(CS-2).
  public getVisibleSpots(): CampSpot[] {
    return this.spots.filter(spot => {
      if (this.selectedType !== null && spot.type !== this.selectedType) {
        return false;
      }

      if (
        this.selectedTag !== null &&
        !(spot.tags ?? []).includes(this.selectedTag)
      ) {
        return false;
      }

      if (this.favoriteOnly && !this.favoriteStore.isFavorite(spot.id)) {
        return false;
      }

      return true;
    });
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
      // 지역은 표시와 동일하게 시/도 + 시/군/구를 함께 대상으로 삼는다(DM-17).
      // `평창`처럼 시군구만 입력해도 찾히게 하려는 의도적 확대이며, 기존 시/도 검색은 그대로 동작한다.
      const region = getCampSpotRegionLabel(spot).toLowerCase();

      return name.includes(keyword) || region.includes(keyword);
    });

    return matched.slice(0, CampSiteMap.SEARCH_RESULT_LIMIT);
  }

  // 배낭 여행지 선택기의 통합 검색(DST-4)용 활성 박지 검색.
  // 지도 탭 드롭다운(CS-6)과 달리 선택기는 자체 검색어 상태를 들고 있어 인자로 받고,
  // 태그 라벨(`산`·`계곡` 등)까지 대상에 넣어 지형으로도 찾을 수 있게 한다.
  public searchSpotsBy(keyword: string): CampSpot[] {
    const normalized = keyword.trim().toLowerCase();

    if (normalized.length === 0) {
      return [];
    }

    const matched = this.spots.filter(spot => {
      const tagLabels = (spot.tags ?? []).map(tag => getCampSiteTagLabel(tag));
      const haystack = [spot.name, spot.region, spot.city ?? '', ...tagLabels]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalized);
    });

    return matched.slice(0, CampSiteMap.SEARCH_RESULT_LIMIT);
  }

  public getSpotsByName(name: string): CampSpot[] {
    const normalized = name.replace(/\s+/g, '').toLowerCase();

    if (normalized.length === 0) {
      return [];
    }

    return this.spots.filter(
      spot => spot.name.replace(/\s+/g, '').toLowerCase() === normalized
    );
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

  // 문서 id로 활성 박지 1건(DST-3 — 저장된 여행지의 박지 링크 복원).
  // 삭제·비활성된 박지는 로드 대상이 아니라 null이 되고, 호출자는 저장된 스냅샷을 그대로 쓴다(DST-7).
  public getSpotById(id: string): CampSpot | null {
    return this.spots.find(spot => spot.id === id) ?? null;
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

  public selectTag(tag: CampSiteTag | null) {
    this.selectedTag = tag;
  }

  public getSelectedTag(): CampSiteTag | null {
    return this.selectedTag;
  }

  public selectType(type: CampSiteType | null) {
    this.selectedType = type;
  }

  /**
   * 유형·태그 필터를 모두 해제한다(CS-6).
   *
   * 검색은 필터와 독립이라 필터에 걸러진 박지도 결과에 나온다. 그 항목을 고르면 카메라는
   * 그리로 가는데 마커는 필터에 막혀 안 보여, 빈 지도만 남는다. 선택한 박지를 보여주는 게
   * 필터 유지보다 우선이라 이때 필터를 푼다.
   *
   * 즐겨찾기 전용(`favoriteOnly`)은 건드리지 않는다 — 칩이 아니라 시트 열림 상태에
   * 묶인 값이라 여기서 끄면 시트와 어긋난다.
   */
  public resetFilters() {
    this.selectedType = null;
    this.selectedTag = null;
  }

  // 즐겨찾기 리스트 시트(CS-9) 열림/닫힘에 맞춰 즐겨찾기 전용 마커 필터를 토글한다.
  public setFavoriteOnly(value: boolean) {
    this.favoriteOnly = value;
  }

  public isFavoriteOnly(): boolean {
    return this.favoriteOnly;
  }

  // 즐겨찾기 리스트 시트(CS-9)에 뿌릴 박지 목록 — 로드된 활성 박지와 즐겨찾기 id를 조인한다.
  // 삭제·비활성 박지는 spots에 없어 자연히 빠진다(DST-7과 동일한 관용).
  public getFavoriteSpots(): CampSpot[] {
    return this.spots.filter(spot => this.favoriteStore.isFavorite(spot.id));
  }

  // ★ 칩 노출 가드용(CS-9). 선택기는 즐겨찾기가 하나도 없으면 칩 자체를 숨긴다.
  public hasFavorites(): boolean {
    return this.favoriteStore.hasFavorites();
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
