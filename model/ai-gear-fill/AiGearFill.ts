import { makeAutoObservable, runInAction } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import dayjs from 'dayjs';
import app from '../app/App';
import GearFilter from '../gear/GearFilter';
import NetworkStatus from '../offline/NetworkStatus';
import LocalStorageManager from '../storage/LocalStorageManager';
import AiGearFillApi, {
  AiGearFillResultData,
  AiGearFillTripData,
} from './AiGearFillApi';
import AiGearFillApplier from './AiGearFillApplier';
import AiGearFillErrorKind from './AiGearFillErrorKind';
import AiGearFillItem from './AiGearFillItem';
import AiGearFillPhase from './AiGearFillPhase';

// 첫 사용 안내 한 줄(AS-10)을 닫았는지 — 모든 AI 액션이 같이 쓰는 기기 키.
const NOTICE_STORAGE_KEY = 'ai_action_notice_seen_v1';
const TODAY_FORMAT = 'YYYY-MM-DD';
// `missingGroups`로 올 수 있는 필수 4종 그룹(DM-4 1차 그룹 키) — 이 순서로 보여 준다(AS-13).
const ESSENTIAL_GROUPS: GearFilter[] = [
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Mat,
  GearFilter.Backpack,
];

/**
 * AI 장비 자동 채우기 시트(AS-8·AS-13~15)의 도메인 객체. 시트를 열 때 1회 만든다.
 *
 * - `load()` — 서버 모드 호출 1회. 결과가 오면 **전부 선택**(AS-14 기본값).
 * - `retry()` — `다시 추천`(한도 1회를 쓴다). 에러 화면의 `다시 시도`는 계측 없이 `load()`.
 * - `apply()` — 체크한 것만 기존 스토어로 담고(AS-5) 토스트 후 시트를 닫는다. 실패하면 시트에 남는다.
 */
class AiGearFill {
  public static from(router: ImperativeRouter, bagId: string) {
    return new AiGearFill(
      router,
      bagId,
      AiGearFillApi.new(),
      AiGearFillApplier.new(app.getBagStore()!, app.getGearStore()!),
      app.getNetworkStatus()
    );
  }

  private phase: AiGearFillPhase = AiGearFillPhase.Loading;
  private errorKind: AiGearFillErrorKind = AiGearFillErrorKind.Generic;
  private items: AiGearFillItem[] = [];
  private selectedIds = new Set<string>();
  private headline = '';
  private notes: string[] = [];
  private trip: AiGearFillTripData | null = null;
  private missingGroups: GearFilter[] = [];
  private warehouseEmpty = false;
  private remaining: number | null = null;
  private applying = false;
  private applyFailed = false;
  private noticeVisible = false;
  // 응답 순서 가드 — 닫힌 뒤나 재호출 뒤에 늦게 온 응답이 화면을 덮지 않게 한다.
  private requestSeq = 0;
  // 시트가 이미 닫혔는지(×·스와이프) — 담기 완료 뒤 `router.back()`이 한 화면 더 뒤로 가지 않게 한다.
  private disposed = false;

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly bagId: string,
    private readonly api: AiGearFillApi,
    private readonly applier: AiGearFillApplier,
    private readonly networkStatus: NetworkStatus
  ) {
    makeAutoObservable<AiGearFill, 'requestSeq' | 'disposed'>(this, {
      requestSeq: false,
      disposed: false,
    });
  }

  // ── 첫 사용 안내(AS-10) ─────────────────

  public async initializeNotice(): Promise<void> {
    // 저장소를 못 읽으면(null) 안내를 보여 준다 — 데이터 처리 안내는 빠뜨리는 쪽이 더 나쁘다.
    const seen = await LocalStorageManager.get<boolean>(NOTICE_STORAGE_KEY);

    runInAction(() => {
      this.noticeVisible = seen !== true;
    });
  }

  public isNoticeVisible() {
    return this.noticeVisible;
  }

  public async dismissNotice(): Promise<void> {
    this.noticeVisible = false;
    // 저장 실패는 다음 진입에 안내가 한 번 더 보일 뿐이다.
    await LocalStorageManager.set(NOTICE_STORAGE_KEY, true);
  }

  // ── 호출(AS-8) ─────────────────

  public async load(): Promise<void> {
    const seq = ++this.requestSeq;

    this.applyFailed = false;

    // 오프라인이면 부르지 않는다(AS-8 netinfo `isConnected === false`).
    if (this.networkStatus.isDisconnected()) {
      this.setError(AiGearFillErrorKind.Offline);

      return;
    }

    this.phase = AiGearFillPhase.Loading;
    this.items = [];
    this.selectedIds = new Set();

    const startedAt = Date.now();

    try {
      const response = await this.api.request(
        this.bagId,
        app.getL10n().language,
        dayjs().format(TODAY_FORMAT)
      );

      if (seq !== this.requestSeq) {
        return;
      }

      runInAction(() => {
        if (typeof response?.remaining === 'number') {
          this.remaining = response.remaining;
        }
      });

      if (!response || response.refused || !response.result) {
        this.setError(AiGearFillErrorKind.Refused);

        return;
      }

      this.applyResult(response.result, Date.now() - startedAt);
    } catch (error) {
      if (seq !== this.requestSeq) {
        return;
      }

      console.warn('AI 장비 자동 채우기 호출 실패', error); // l10n-ignore: console 개발자 로그
      this.setError(AiGearFillApi.toErrorKind(error));
    }
  }

  // `다시 추천`(AS-15) — 결과를 비우고 다시 부른다. 남은 횟수가 0이면 막는다.
  public async retry(): Promise<void> {
    if (!this.canRetry()) {
      return;
    }

    app.getAnalyticsManager()?.logClick('ai_gear_fill_retry');
    await this.load();
  }

  // 창고가 비어 있으면(AS-15) 다시 불러도 결과가 같다 — 모델을 부르지 않았으므로 막는다.
  public canRetry() {
    return !this.applying && this.remaining !== 0 && !this.warehouseEmpty;
  }

  // 시트가 마운트될 때(개발 중 Fast Refresh로 effect가 다시 돌 때 포함) 닫힘 표시를 되돌린다.
  public activate() {
    this.disposed = false;
  }

  public dispose() {
    // 닫힌 뒤 도착한 응답은 버린다.
    this.requestSeq += 1;
    this.disposed = true;
  }

  private applyResult(result: AiGearFillResultData, elapsedMs: number) {
    const { headline, notes, trip, missingGroups } = result;
    const rawItems = Array.isArray(result.items) ? result.items : [];
    const seen = new Set<string>();
    const items: AiGearFillItem[] = [];

    for (const raw of rawItems) {
      const item = AiGearFillItem.from(raw);

      if (item && !seen.has(item.getGearId())) {
        seen.add(item.getGearId());
        items.push(item);
      }
    }

    this.headline = typeof headline === 'string' ? headline : '';
    this.notes = Array.isArray(notes)
      ? notes.filter(
          (note): note is string =>
            typeof note === 'string' && note.trim() !== ''
        )
      : [];
    this.trip = trip ?? null;
    // 두 새 필드는 옛 서버가 보내지 않을 수 있다 — 없으면 []/false. 필수 4종 밖의 키는 버리고 순서를 고정한다.
    this.missingGroups = Array.isArray(missingGroups)
      ? ESSENTIAL_GROUPS.filter(group => missingGroups.includes(group))
      : [];
    this.warehouseEmpty = result.warehouseEmpty === true;
    this.items = items;
    this.selectedIds = new Set(items.map(item => item.getGearId()));
    this.phase =
      items.length > 0 ? AiGearFillPhase.Result : AiGearFillPhase.Empty;

    app.getAnalyticsManager()?.logClick('ai_gear_fill_result', {
      items: items.length,
      essential: items.filter(item => item.isEssential()).length,
      missing: this.missingGroups.length,
      ms: elapsedMs,
    });
  }

  private setError(kind: AiGearFillErrorKind) {
    this.errorKind = kind;
    this.phase = AiGearFillPhase.Error;

    if (kind !== AiGearFillErrorKind.Offline) {
      app.getAnalyticsManager()?.logClick('ai_gear_fill_error', { kind });
    }
  }

  // ── 상태 읽기 ─────────────────

  public getPhase() {
    return this.phase;
  }

  public getErrorKind() {
    return this.errorKind;
  }

  public getHeadline() {
    return this.headline;
  }

  public getNotes() {
    return this.notes;
  }

  public getRemaining() {
    return this.remaining;
  }

  // 창고에 없는 필수 그룹(AS-14 `창고에 없어요` 줄) — DM-4 1차 그룹, 텐트·침낭·매트·배낭 순.
  public getMissingGroups() {
    return this.missingGroups;
  }

  // 창고가 비어 서버가 모델을 부르지 않았다(AS-15 빈 상태 문구·`다시 추천` 숨김).
  public isWarehouseEmpty() {
    return this.warehouseEmpty;
  }

  public getEssentialItems() {
    return this.items.filter(item => item.isEssential());
  }

  public getRecommendedItems() {
    return this.items.filter(item => !item.isEssential());
  }

  public getTripName() {
    return this.trip?.name ?? '';
  }

  // 날씨 한 줄(AS-13 `trip.weatherLine`) — 캐시·예보가 모두 없으면 빈 문자열.
  public getWeatherLine() {
    return this.trip?.weatherLine ?? '';
  }

  // 대상 줄의 기간(`2026.11.07 ~ 2026.11.08`) — 날짜 미정이면 빈 문자열.
  public getTripPeriod() {
    const start = this.trip?.startDate ? dayjs(this.trip.startDate) : null;
    const end = this.trip?.endDate ? dayjs(this.trip.endDate) : null;

    if (!start?.isValid()) {
      return '';
    }

    const l10n = app.getL10n();
    const format = l10n.t('bag.dateShortFormat');

    if (!end?.isValid() || start.isSame(end, 'day')) {
      return start.format(format);
    }

    return `${start.format(format)}${l10n.t('bag.dateRangeSeparator')}${end.format(format)}`;
  }

  // 지난 여행(§6) — 근거 줄에 `지난 여행이에요`를 앞세운다.
  public isPastTrip() {
    const end = this.trip?.endDate ? dayjs(this.trip.endDate) : null;

    return Boolean(end?.isValid() && end.isBefore(dayjs(), 'day'));
  }

  // ── 선택(AS-14) ─────────────────

  public isSelected(item: AiGearFillItem) {
    return this.selectedIds.has(item.getGearId());
  }

  public toggle(item: AiGearFillItem) {
    if (this.applying) {
      return;
    }

    const next = new Set(this.selectedIds);

    if (next.has(item.getGearId())) {
      next.delete(item.getGearId());
    } else {
      next.add(item.getGearId());
    }

    this.selectedIds = next;
    this.applyFailed = false;
  }

  private getSelectedItems() {
    return this.items.filter(item => this.selectedIds.has(item.getGearId()));
  }

  public getSelectedCount() {
    return this.getSelectedItems().length;
  }

  // 선택 장비 무게 합(kg, 소수 둘째 자리 문자열).
  public getSelectedWeightKg() {
    const grams = this.getSelectedItems().reduce(
      (sum, item) => sum + item.getWeightG(),
      0
    );

    return (grams / 1000).toFixed(2);
  }

  // ── 적용(AS-5·AS-15) ─────────────────

  public isApplying() {
    return this.applying;
  }

  public hasApplyFailed() {
    return this.applyFailed;
  }

  public async apply(): Promise<void> {
    const selected = this.getSelectedItems();

    if (this.applying || selected.length === 0) {
      return;
    }

    this.applying = true;
    this.applyFailed = false;

    try {
      const { added, failed } = await this.applier.apply(this.bagId, selected);

      app.getAnalyticsManager()?.logClick('ai_gear_fill_apply', {
        selected: selected.length,
        total: this.items.length,
        failed,
      });

      // 하나도 담지 못했으면 실패로 본다 — `장비 0개를 담았어요`는 뜻이 없다.
      if (added === 0) {
        runInAction(() => {
          this.applyFailed = true;
        });

        return;
      }

      const l10n = app.getL10n();
      const message = l10n.t('aiGearFill.applied', { count: added });

      app.getToastManager()?.show({
        message:
          failed > 0
            ? `${message}${l10n.t('aiGearFill.appliedPartial', { count: failed })}`
            : message,
      });
      // 담는 중 사용자가 이미 닫았으면 한 화면 더 뒤로 가지 않는다.
      if (!this.disposed) {
        this.close();
      }
    } catch (error) {
      console.warn('AI 장비 자동 채우기 담기 실패', error); // l10n-ignore: console 개발자 로그
      runInAction(() => {
        this.applyFailed = true;
      });
    } finally {
      runInAction(() => {
        this.applying = false;
      });
    }
  }

  // ── 이동 ─────────────────

  public close() {
    this.router.back();
  }

  // 결과 0개·거절·창고에 없는 필수 줄 → 이 배낭 컨텍스트의 검색 모달로 교체(AS-8·AS-15, GE-8).
  public goToSearch() {
    this.router.replace(`/search?bagId=${this.bagId}`);
  }
}

export default AiGearFill;
