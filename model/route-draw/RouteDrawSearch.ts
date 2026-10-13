import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import geocodeService, {
  GEOCODE_DEBOUNCE_MS,
  GEOCODE_MIN_QUERY_LENGTH,
} from '@/model/bag-destination/GeocodeService';
import RouteDrawSource from './RouteDrawSource';

// 드롭다운에 보이는 결과 상한(RD-5).
const ROUTE_DRAW_SEARCH_MAX_RESULTS = 8;

// 검색 결과로 옮긴 자리의 임시 핀(RD-5) — 저장에 들어가지 않는다.
export interface RouteDrawSearchPin {
  latitude: number;
  longitude: number;
  name: string;
}

/**
 * 그리기 모드의 위치 검색 (RD-5). 그리기 인스턴스(`RouteDraw`)가 하나를 들고, 모드에 들어가거나 나갈 때 함께 비운다.
 *
 * 검색은 카카오 키워드 검색(`GeocodeService`)을 그대로 쓴다 — 2자 이상 · 400ms 디바운스 · 실패는 조용히 빈 결과
 * (DST-4·CS-6과 같은 규칙). 카메라 이동·키보드 닫기는 화면이 한다(`useRouteDrawSearchHost`).
 */
class RouteDrawSearch {
  private query = '';
  private results: GeocodeResult[] = [];
  private searching = false;
  private resultsOpen = false;
  private pin: RouteDrawSearchPin | null = null;
  // 검색 요청마다 올린다 — 늦게 온 응답이 새 검색어의 결과를 덮지 않게.
  private requestSeq = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;

  public static from(source: RouteDrawSource) {
    return new RouteDrawSearch(source);
  }

  private constructor(private readonly source: RouteDrawSource) {
    makeAutoObservable<RouteDrawSearch, 'source' | 'requestSeq' | 'timer'>(
      this,
      { source: false, requestSeq: false, timer: false }
    );
  }

  public getQuery(): string {
    return this.query;
  }

  public getResults(): readonly GeocodeResult[] {
    return this.results;
  }

  public isSearching(): boolean {
    return this.searching;
  }

  public getPin(): RouteDrawSearchPin | null {
    return this.pin;
  }

  // 검색어가 2자 이상이고 닫지 않았을 때만 드롭다운을 연다.
  public isResultsVisible(): boolean {
    return this.resultsOpen && this.hasQuery();
  }

  public setQuery(value: string) {
    this.query = value;
    this.resultsOpen = true;
    this.scheduleSearch();
  }

  // 키보드 검색 버튼 — 디바운스를 기다리지 않고 바로 찾는다. 2자 미만이면 무시한다.
  public searchNow() {
    const trimmed = this.query.trim();

    if (trimmed.length < GEOCODE_MIN_QUERY_LENGTH) {
      return;
    }

    this.cancelPending();

    const seq = this.requestSeq;

    this.resultsOpen = true;
    this.searching = true;
    void this.runSearch(trimmed, seq);
  }

  // 인풋에 다시 포커스하면 남아 있는 결과를 다시 연다.
  public openResults() {
    this.resultsOpen = true;
  }

  public closeResults() {
    this.resultsOpen = false;
  }

  /**
   * 결과 행 탭(RD-5) — 드롭다운을 닫고 그 자리에 임시 핀을 둔다. 검색어는 유지한다.
   * 카메라는 화면이 옮긴다(점은 찍지 않는다).
   */
  public select(result: GeocodeResult) {
    this.resultsOpen = false;
    this.pin = {
      latitude: result.latitude,
      longitude: result.longitude,
      name: result.name,
    };
    app.getAnalyticsManager()?.logClick('route_draw_search_select', {
      source: this.source,
    });
  }

  // 점을 찍으면 임시 핀은 사라진다(RD-5).
  public clearPin() {
    this.pin = null;
  }

  // 지우기 × · 모드 진입/종료 — 검색어·결과·임시 핀을 모두 비운다.
  public clear() {
    this.cancelPending();
    this.query = '';
    this.results = [];
    this.searching = false;
    this.resultsOpen = false;
    this.pin = null;
  }

  private hasQuery(): boolean {
    return this.query.trim().length >= GEOCODE_MIN_QUERY_LENGTH;
  }

  private cancelPending() {
    this.requestSeq += 1;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private scheduleSearch() {
    this.cancelPending();

    const trimmed = this.query.trim();

    if (trimmed.length < GEOCODE_MIN_QUERY_LENGTH) {
      this.results = [];
      this.searching = false;

      return;
    }

    const seq = this.requestSeq;

    this.searching = true;
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.runSearch(trimmed, seq);
    }, GEOCODE_DEBOUNCE_MS);
  }

  private async runSearch(trimmed: string, seq: number) {
    let found: GeocodeResult[] = [];

    try {
      found = await geocodeService.geocode(trimmed);
    } catch (error) {
      // 실패는 조용히 빈 결과로 — 그리기는 검색 없이도 된다(RD-5).
      console.warn('[RouteDrawSearch] 장소 검색 실패', error); // l10n-ignore: 개발자 로그
    }

    runInAction(() => {
      if (seq !== this.requestSeq) {
        return;
      }

      this.results = found.slice(0, ROUTE_DRAW_SEARCH_MAX_RESULTS);
      this.searching = false;
    });
  }
}

export default RouteDrawSearch;
