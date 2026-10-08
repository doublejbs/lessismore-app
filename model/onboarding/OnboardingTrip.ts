import dayjs, { Dayjs } from 'dayjs';
import { makeAutoObservable, runInAction } from 'mobx';
import app from '../app/App';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import { getGroupForCategory } from '../gear/GearCategoryGroups';
import { getGearFilterName } from '../gear/GearFilterName';
import OrderType from '../order/OrderType';
import GearRankStore from '../search/GearRankStore';
import { BagLocation } from '../bag-destination/BagLocation';
import { saveBagDestination } from '../bag-destination/BagDestinationSave';
import { FALLBACK_LOCATION_NAME } from '../bag-destination/GeocodeService';
import { getUpcomingWeekend } from '../bag/QuickBagDefaults';
import NotificationPermissionStatus from '../notification/NotificationPermissionStatus';
import OnboardingTripStep from './OnboardingTripStep';
import OnboardingTripAction from './OnboardingTripAction';
import OnboardingTripGearMode from './OnboardingTripGearMode';
import OnboardingTripGearSource from './OnboardingTripGearSource';
import OnboardingTripPermission from './OnboardingTripPermission';
import OnboardingTripStatus from './OnboardingTripStatus';
import OnboardingTripLoginResult from './OnboardingTripLoginResult';
import {
  ONBOARDING_TRIP_DRAFT_VERSION,
  OnboardingTripDraft,
  fromDraftGear,
  toDraftGear,
} from './OnboardingTripDraft';

const STEPS: OnboardingTripStep[] = [
  OnboardingTripStep.Date,
  OnboardingTripStep.Destination,
  OnboardingTripStep.Gear,
  OnboardingTripStep.Done,
];

// 3단계 체크리스트 섹션 순서 — 백패킹 필수 4종을 먼저 둔다(OB-6).
const GEAR_GROUP_ORDER: GearFilter[] = [
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Mat,
  GearFilter.Backpack,
  GearFilter.Clothing,
  GearFilter.Cooking,
  GearFilter.Lantern,
  GearFilter.Furniture,
  GearFilter.Electronic,
  GearFilter.Food,
  GearFilter.Etc,
];

// 인기 장비 구획의 필수 카테고리(OB-6).
export const REQUIRED_GEAR_GROUPS: GearFilter[] = [
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Mat,
  GearFilter.Backpack,
];

// 카테고리마다 보여 줄 인기 장비 수와, 창고 보유분을 빼도 그만큼 남도록 읽는 수(OB-6).
export const POPULAR_GEAR_COUNT = 5;
const POPULAR_GEAR_FETCH = 8;

export interface OnboardingTripGearSection {
  group: GearFilter;
  title: string;
  data: Gear[];
}

export interface OnboardingTripCreateResult {
  bagId: string;
  // 여행은 만들었지만 여행지·장비 저장 중 일부가 실패함(OB-7).
  partialFailure: boolean;
}

const DRAFT_DATE_FORMAT = 'YYYY-MM-DD';

const parseWeight = (gear: Gear): number => {
  const weight = parseInt(gear.getWeight() || '0', 10);

  return Number.isFinite(weight) ? weight : 0;
};

/**
 * 첫 여행 만들기 가이드 화면 도메인(OB-3~OB-9).
 *
 * 입력은 화면 안에서만 들고 있다가 **완료 단계에서 한 번에** 기존 생성 경로로 쓴다(OB-7) —
 * 건너뛰기·닫기·앱 종료 어느 경우에도 반쯤 만든 여행이 남지 않는다.
 */
class OnboardingTrip {
  // draft가 있으면 로그인 이어가기(OB-12) — 고른 내용을 되살려 완료 단계에서 연다.
  public static new(draft: OnboardingTripDraft | null = null) {
    return new OnboardingTrip(draft);
  }

  private step: OnboardingTripStep = OnboardingTripStep.Date;
  private startDate: Dayjs | null = null;
  private endDate: Dayjs | null = null;
  private datesUndecided = false;
  private location: BagLocation | null = null;
  private gearMode: OnboardingTripGearMode | null = null;
  private gearLoading = false;
  private gearError = false;
  private warehouseGears: Gear[] = [];
  // 3단계에 처음 들어왔을 때 창고에 있던 장비 — 이후 새로 들어온 장비를 자동 선택한다(OB-6).
  private knownGearIds: string[] | null = null;
  private selectedGearIds: string[] = [];
  // 인기 장비(카테고리별, gear-rank) — 3단계 첫 진입에 한 번 읽고 세션 동안 캐시한다(OB-6).
  private popularGears: Partial<Record<GearFilter, Gear[]>> = {};
  private popularLoading = false;
  private popularRequested = false;
  // 비로그인 검색 담기 모드로 고른 카탈로그 장비(OB-13). 창고에 쓰지 않고 생성 때 등록한다.
  private pickedGears: Gear[] = [];
  // 검색·직접 추가를 열 때 남겨 두고, 돌아와 자동 선택한 장비의 계측 source로 쓴다(OB-9).
  private pendingPickSource: OnboardingTripGearSource | null = null;
  private permissionStatus: NotificationPermissionStatus | null = null;
  private creating = false;
  // add 성공 후 보관 — 재시도해도 여행이 두 개 생기지 않는다(OB-7).
  private createdBagId: string | null = null;
  // 로그인하고 여행 만들기(OB-12): 로그인 뒤 자동으로 만들 차례인지.
  private awaitingLogin = false;
  // 로그인 성공 계측을 이미 보냈는지 — 이어가기로 연 가이드는 다시 보내지 않는다(OB-9).
  private loginLogged = false;
  private autoCreateStarted = false;

  private constructor(draft: OnboardingTripDraft | null) {
    makeAutoObservable(this);

    if (draft) {
      this.restoreDraft(draft);
    }
  }

  private restoreDraft(draft: OnboardingTripDraft): void {
    this.startDate = draft.startDate ? dayjs(draft.startDate) : null;
    this.endDate = draft.endDate ? dayjs(draft.endDate) : null;
    this.datesUndecided = draft.datesUndecided;
    this.location = draft.location;
    this.pickedGears = draft.catalogGears.map(fromDraftGear);
    this.selectedGearIds = this.pickedGears.map(gear => gear.getId());
    this.step = OnboardingTripStep.Done;
    // 로그인한 채로 다시 열었으면 바로 이어 만들고, 비로그인(인증 전 종료)이면 로그인 버튼부터 다시 누른다.
    this.awaitingLogin = !this.isGuest();
    this.loginLogged = true;
  }

  // ── 로그인 상태 ───────────────────────────────────────

  // 비로그인 가이드인지(OB-11). 화면 분기(완료 단계 버튼·3단계 담기 모드)는 모두 이 값을 본다.
  public isGuest(): boolean {
    return !app.getFirebase().isLoggedIn();
  }

  // ── 단계 ──────────────────────────────────────────────

  public getStep(): OnboardingTripStep {
    return this.step;
  }

  public getStepIndex(): number {
    return STEPS.indexOf(this.step);
  }

  public getStepCount(): number {
    return STEPS.length;
  }

  public canGoBack(): boolean {
    return this.getStepIndex() > 0 && !this.creating;
  }

  public goBack(): void {
    if (!this.canGoBack()) {
      return;
    }

    this.step = STEPS[this.getStepIndex() - 1];
  }

  // 주 액션·보조 버튼으로 다음 단계로 간다(1~3단계). 분석 이벤트는 여기서만 보낸다(OB-9).
  public advance(action: OnboardingTripAction): void {
    const current = this.step;

    if (current === OnboardingTripStep.Done) {
      return;
    }

    if (action === OnboardingTripAction.Skip) {
      this.applySkip(current);
    }

    this.logStep(current, action);
    this.step = STEPS[this.getStepIndex() + 1];
  }

  // 1단계에서 아무것도 고르지 않았으면 확인 없이 닫는다(OB-3).
  public hasProgress(): boolean {
    return (
      this.getStepIndex() > 0 ||
      this.startDate !== null ||
      this.endDate !== null
    );
  }

  public async dismiss(): Promise<void> {
    app
      .getAnalyticsManager()
      ?.logClick('onboarding_trip_dismiss', { step: this.step });
    await app
      .getOnboardingTripManager()
      ?.finish(OnboardingTripStatus.Dismissed);
  }

  private applySkip(step: OnboardingTripStep): void {
    if (step === OnboardingTripStep.Date) {
      this.startDate = null;
      this.endDate = null;
      this.datesUndecided = true;
    } else if (step === OnboardingTripStep.Destination) {
      this.location = null;
    } else if (step === OnboardingTripStep.Gear) {
      this.selectedGearIds = [];
    }
  }

  private logStep(step: OnboardingTripStep, action: OnboardingTripAction) {
    app
      .getAnalyticsManager()
      ?.logClick('onboarding_trip_step', { step, action });
  }

  // ── 1단계: 날짜 ───────────────────────────────────────

  public getStartDate(): Dayjs | null {
    return this.startDate;
  }

  public getEndDate(): Dayjs | null {
    return this.endDate;
  }

  public setStartDate(date: Dayjs): void {
    this.startDate = date;
    this.datesUndecided = false;
  }

  public setEndDate(date: Dayjs | null): void {
    this.endDate = date;
    this.datesUndecided = false;
  }

  public hasDateRange(): boolean {
    return this.startDate !== null && this.endDate !== null;
  }

  public isDatesUndecided(): boolean {
    return this.datesUndecided || !this.hasDateRange();
  }

  // 날짜는 필수라 미정이면 즉시 생성 기본값(다가오는 주말 1박)을 쓴다(OB-4, BAG-2).
  public getEffectiveDates(): { startDate: Dayjs; endDate: Dayjs } {
    if (this.startDate && this.endDate && !this.datesUndecided) {
      return { startDate: this.startDate, endDate: this.endDate };
    }

    return getUpcomingWeekend(dayjs());
  }

  // 완료 단계 요약의 기간(BAG-1 표시 규칙). 미정이면 `(임시)`를 붙인다(OB-7).
  public getDisplayDates(): string {
    const l10n = app.getL10n();
    const { startDate, endDate } = this.getEffectiveDates();
    const format = l10n.t('bag.dateShortFormat');
    const dates = startDate.isSame(endDate, 'day')
      ? startDate.format(format)
      : `${startDate.format(format)}${l10n.t('bag.dateRangeSeparator')}${endDate.format(format)}`;

    if (this.isDatesUndecided()) {
      return l10n.t('onboarding.done.tentativeDates', { dates });
    }

    return dates;
  }

  // ── 2단계: 여행지 ─────────────────────────────────────

  public getLocation(): BagLocation | null {
    return this.location;
  }

  // 선택기(DST-3) onConfirm — 여행이 아직 없으므로 가이드 상태에만 담는다(OB-5).
  public setLocation(location: BagLocation): void {
    this.location = location;
  }

  // ── 3단계: 장비 ───────────────────────────────────────

  public getGearMode(): OnboardingTripGearMode | null {
    return this.gearMode;
  }

  public isGearLoading(): boolean {
    return this.gearLoading;
  }

  public hasGearError(): boolean {
    return this.gearError;
  }

  // 3단계 진입·포커스 복귀마다 창고를 다시 읽는다. 모드는 첫 성공 때 한 번 정한다(OB-6).
  public async loadGears(): Promise<void> {
    const gearStore = app.getGearStore();

    if (!gearStore || this.gearLoading) {
      return;
    }

    // 비로그인은 창고가 없다 — 읽지 않고 인기 장비 모드로 연다(OB-13).
    if (this.isGuest()) {
      this.applyLoadedGears([]);

      return;
    }

    this.gearLoading = true;
    this.gearError = false;

    try {
      const gears = await gearStore.getList(
        [GearFilter.All],
        OrderType.CreatedDesc
      );

      runInAction(() => {
        this.applyLoadedGears(gears);
      });
    } catch (error) {
      console.warn('첫 여행 가이드 창고 조회 실패', error); // l10n-ignore: console 개발자 로그
      runInAction(() => {
        this.gearError = true;
      });
    } finally {
      runInAction(() => {
        this.gearLoading = false;
      });
    }
  }

  private applyLoadedGears(gears: Gear[]): void {
    const ids = gears.map(gear => gear.getId());

    if (this.knownGearIds === null) {
      this.knownGearIds = ids;
      this.gearMode =
        gears.length > 0
          ? OnboardingTripGearMode.Warehouse
          : OnboardingTripGearMode.Popular;
    } else {
      const known = new Set(this.knownGearIds);
      const added = gears.filter(gear => !known.has(gear.getId()));
      const source = this.pendingPickSource ?? OnboardingTripGearSource.Search;

      // 검색·직접 추가로 방금 창고에 담은 장비는 이 여행에도 담는다(OB-6).
      // 인기 장비에서 이미 고른 장비면 같은 ID라 하나로 합친다.
      added.forEach(gear => {
        if (!this.selectedGearIds.includes(gear.getId())) {
          this.selectedGearIds = [...this.selectedGearIds, gear.getId()];
          this.logPick(gear, source);
        }
      });
      this.knownGearIds = ids;
    }

    this.pendingPickSource = null;

    // 창고에서 사라진 장비는 선택에서도 뺀다(인기 장비 선택은 창고와 무관하게 유지).
    const present = new Set([
      ...ids,
      ...this.getAllCatalogGears().map(gear => gear.getId()),
    ]);

    this.selectedGearIds = this.selectedGearIds.filter(id => present.has(id));
    this.warehouseGears = gears;
  }

  // 검색 모달·직접 추가를 열기 직전에 부른다 — 돌아와 자동 선택한 장비의 계측 source(OB-9).
  public markPickSource(source: OnboardingTripGearSource): void {
    this.pendingPickSource = source;
  }

  // ── 3단계: 인기 장비(OB-6) ────────────────────────────

  // 첫 진입에 한 번만 읽는다. 카테고리마다 따로 받아 하나가 실패해도 나머지는 그린다.
  public async loadPopularGears(): Promise<void> {
    if (this.popularRequested) {
      return;
    }

    this.popularRequested = true;
    this.popularLoading = true;

    const store = new GearRankStore(app.getFirebase());
    const results = await Promise.allSettled(
      REQUIRED_GEAR_GROUPS.map(group =>
        store.loadTopGears(group, POPULAR_GEAR_FETCH)
      )
    );

    runInAction(() => {
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          this.popularGears[REQUIRED_GEAR_GROUPS[index]] = result.value;
        } else {
          // 실패는 조용히 숨긴다 — 보조 액션(검색·직접 추가)은 그대로 남는다(OB-6).
          console.warn('첫 여행 가이드 인기 장비 조회 실패', result.reason); // l10n-ignore: console 개발자 로그
        }
      });
      this.popularLoading = false;
    });
  }

  public isPopularLoading(): boolean {
    return this.popularLoading;
  }

  // 창고에 이미 있거나 검색으로 담은 장비는 빼고 앞에서 5개(OB-6·OB-13).
  public getPopularGears(group: GearFilter): Gear[] {
    const owned = new Set(
      [...this.warehouseGears, ...this.pickedGears].map(gear => gear.getId())
    );

    return (this.popularGears[group] ?? [])
      .filter(gear => !owned.has(gear.getId()))
      .slice(0, POPULAR_GEAR_COUNT);
  }

  private getAllPopularGears(): Gear[] {
    return REQUIRED_GEAR_GROUPS.flatMap(
      group => this.popularGears[group] ?? []
    );
  }

  // 인기 장비 + 검색 담기로 고른 카탈로그 장비 — 생성 전까지 창고에 없는 장비들.
  private getAllCatalogGears(): Gear[] {
    return [...this.pickedGears, ...this.getAllPopularGears()];
  }

  // 비로그인 검색 담기 모드에서 고른 장비를 받는다(OB-13). 이미 고른 장비면 선택만 맞춘다.
  public pickGear(gear: Gear): void {
    const id = gear.getId();

    if (!this.getAllCatalogGears().some(item => item.getId() === id)) {
      this.pickedGears = [...this.pickedGears, gear];
    }

    if (!this.selectedGearIds.includes(id)) {
      this.selectedGearIds = [...this.selectedGearIds, id];
      this.logPick(gear, OnboardingTripGearSource.Search);
    }
  }

  // 인기 장비에서 골랐고 아직 창고에 없는 장비 — 생성 때 창고에 등록한다(OB-7).
  private getSelectedCatalogGears(): Gear[] {
    const owned = new Set(this.warehouseGears.map(gear => gear.getId()));
    const selected = new Set(this.selectedGearIds);
    const seen = new Set<string>();

    return this.getAllCatalogGears().filter(gear => {
      const id = gear.getId();

      if (owned.has(id) || !selected.has(id) || seen.has(id)) {
        return false;
      }

      seen.add(id);

      return true;
    });
  }

  private logPick(gear: Gear, source: OnboardingTripGearSource) {
    app.getAnalyticsManager()?.logClick('onboarding_trip_gear_pick', {
      source,
      category: gear.getGroupCategory(),
    });
  }

  public getWarehouseGears(): Gear[] {
    return this.warehouseGears;
  }

  public getGearSections(): OnboardingTripGearSection[] {
    return GEAR_GROUP_ORDER.map(group => ({
      group,
      title: getGearFilterName(group),
      data: this.getGearsInGroup(group),
    })).filter(section => section.data.length > 0);
  }

  // 창고 장비 + 검색 담기로 고른 장비(OB-13) — 카테고리 아래 인기 행 위에 보인다.
  public getGearsInGroup(group: GearFilter): Gear[] {
    return [...this.warehouseGears, ...this.pickedGears].filter(
      gear => getGroupForCategory(gear.getCategory()) === group
    );
  }

  // 필수 4종 밖의 카테고리로 담은 장비(검색 모드에서 필터를 바꿔 담은 경우).
  public getOtherGears(): Gear[] {
    const required = new Set<string>(REQUIRED_GEAR_GROUPS);

    return [...this.warehouseGears, ...this.pickedGears].filter(
      gear => !required.has(getGroupForCategory(gear.getCategory()))
    );
  }

  public isGearSelected(gear: Gear): boolean {
    return this.selectedGearIds.includes(gear.getId());
  }

  public toggleGear(gear: Gear, source: OnboardingTripGearSource): void {
    const id = gear.getId();

    if (this.selectedGearIds.includes(id)) {
      this.selectedGearIds = this.selectedGearIds.filter(
        selected => selected !== id
      );

      return;
    }

    this.selectedGearIds = [...this.selectedGearIds, id];
    this.logPick(gear, source);
  }

  // 창고 선택 + 인기 장비 선택(창고에 없는 것). 같은 장비는 창고 쪽 하나만.
  public getSelectedGears(): Gear[] {
    const selected = new Set(this.selectedGearIds);

    return [
      ...this.warehouseGears.filter(gear => selected.has(gear.getId())),
      ...this.getSelectedCatalogGears(),
    ];
  }

  public getSelectedCount(): number {
    return this.getSelectedGears().length;
  }

  public getTotalWeightKg(): string {
    const grams = this.getSelectedGears().reduce(
      (sum, gear) => sum + parseWeight(gear),
      0
    );

    return (grams / 1000).toFixed(2);
  }

  // ── 4단계: 완료 ───────────────────────────────────────

  // 여행지가 있으면 `{여행지명} 백패킹`, 없거나 역지오코딩 폴백이면 `첫 백패킹`(OB-7).
  public getTripName(): string {
    const name = this.location?.name.trim() ?? '';

    if (name && name !== FALLBACK_LOCATION_NAME) {
      return app.getL10n().t('onboarding.trip.nameWithPlace', { place: name });
    }

    return app.getL10n().t('onboarding.trip.defaultName');
  }

  public getPermissionStatus(): NotificationPermissionStatus | null {
    return this.permissionStatus;
  }

  // 완료 단계 진입 시 권한 상태를 읽어 버튼 문구를 정한다(OB-7).
  public async loadPermissionStatus(): Promise<void> {
    const manager = app.getNotificationManager();
    const status = manager
      ? await manager.getPermissionStatus()
      : NotificationPermissionStatus.Unavailable;

    runInAction(() => {
      this.permissionStatus = status;
    });
  }

  public canAskPermission(): boolean {
    return this.permissionStatus === NotificationPermissionStatus.Undetermined;
  }

  public isCreating(): boolean {
    return this.creating;
  }

  /**
   * 완료 단계 버튼(OB-7). `askPermission`이면 미결정 권한을 먼저 묻고(OB-8) 그 뒤에 만든다 —
   * 방금 허용한 권한으로 D-1 알림이 바로 예약된다. add가 실패하면 throw한다(호출측 알럿 후 머무름).
   */
  public async create(
    askPermission: boolean,
    fromLogin = false
  ): Promise<OnboardingTripCreateResult | null> {
    const bagStore = app.getBagStore();

    if (this.creating || !bagStore) {
      return null;
    }

    this.creating = true;

    try {
      // 로그인 뒤 이어 만들 때는 `step: login`을 이미 보냈다(OB-9).
      if (!fromLogin) {
        this.logStep(
          OnboardingTripStep.Done,
          askPermission || !this.canAskPermission()
            ? OnboardingTripAction.Next
            : OnboardingTripAction.Skip
        );
      }

      const permission = await this.resolvePermission(askPermission);
      let bagId = this.createdBagId;

      if (!bagId) {
        const { startDate, endDate } = this.getEffectiveDates();

        bagId = await bagStore.add(this.getTripName(), startDate, endDate);
        this.setCreatedBagId(bagId);
        app.getAnalyticsManager()?.logClick('onboarding_trip_complete', {
          has_dates: !this.isDatesUndecided(),
          has_destination: this.location !== null,
          gear_count: this.getSelectedCount(),
          notification: permission,
        });
      }

      let partialFailure = false;

      if (this.location) {
        try {
          await saveBagDestination(bagStore, bagId, this.location);
        } catch (error) {
          console.warn('첫 여행 가이드 여행지 저장 실패', error); // l10n-ignore: console 개발자 로그
          partialFailure = true;
        }
      }

      const catalogGears = this.getSelectedCatalogGears();
      let catalogRegistered = true;

      // 인기 장비에서 고른 장비를 이제 창고에 넣는다 — 중간에 닫으면 아무것도 쓰지 않는다(OB-6·OB-7).
      if (catalogGears.length > 0) {
        try {
          await app.getGearStore()?.register(catalogGears);
        } catch (error) {
          console.warn('첫 여행 가이드 인기 장비 창고 등록 실패', error); // l10n-ignore: console 개발자 로그
          catalogRegistered = false;
          partialFailure = true;
        }
      }

      const catalogIds = new Set(catalogGears.map(gear => gear.getId()));
      const gears = this.getSelectedGears().filter(
        gear => catalogRegistered || !catalogIds.has(gear.getId())
      );

      if (gears.length > 0) {
        try {
          await bagStore.save(bagId, gears, [], gears);
        } catch (error) {
          console.warn('첫 여행 가이드 장비 저장 실패', error); // l10n-ignore: console 개발자 로그
          partialFailure = true;
        }
      }

      await app
        .getOnboardingTripManager()
        ?.finish(OnboardingTripStatus.Completed);

      return { bagId, partialFailure };
    } finally {
      runInAction(() => {
        this.creating = false;
      });
    }
  }

  // ── 로그인하고 여행 만들기(OB-11·OB-12) ─────────────────

  public isAwaitingLogin(): boolean {
    return this.awaitingLogin;
  }

  // 비로그인 완료 단계 주 액션 — 초안을 저장하고 로그인 모달을 연다.
  public async requestLogin(): Promise<void> {
    if (this.creating) {
      return;
    }

    this.logStep(OnboardingTripStep.Login, OnboardingTripAction.Next);
    this.awaitingLogin = true;
    this.loginLogged = false;
    this.autoCreateStarted = false;
    await app.getOnboardingTripManager()?.saveDraft(this.toDraft());
    app.getLogInAlertManager()?.show();
  }

  // 비로그인 완료 단계 보조 버튼 `나중에 할게요` — 확인 없이 닫는다. dismiss 계측은 보내지 않는다(OB-9).
  public async later(): Promise<void> {
    this.logStep(OnboardingTripStep.Login, OnboardingTripAction.Skip);
    await app
      .getOnboardingTripManager()
      ?.finish(OnboardingTripStatus.Dismissed);
  }

  /**
   * 로그인 모달이 닫혔을 때. Auth 세션이 없으면 취소 — 완료 단계에 머물고 초안을 지운다.
   * 세션이 있으면 로그인 상태 전파(AU-7)를 기다린다(handleLoggedIn).
   */
  public async handleLoginClosed(): Promise<void> {
    if (!this.awaitingLogin || app.getFirebase().isLoggedIn()) {
      return;
    }

    if (app.getFirebase().getCurrentUser()) {
      return;
    }

    this.awaitingLogin = false;
    this.logLogin(OnboardingTripLoginResult.Cancel);
    await app.getOnboardingTripManager()?.clearDraft();
  }

  public handleLoggedIn(): void {
    if (!this.awaitingLogin || this.loginLogged) {
      return;
    }

    this.logLogin(OnboardingTripLoginResult.Success);
  }

  // 로그인 + 약관 동의가 끝나면 이어 만든다(OB-12). 한 번만 시도한다.
  public shouldAutoCreate(): boolean {
    const firebase = app.getFirebase();

    return (
      this.awaitingLogin &&
      !this.autoCreateStarted &&
      !this.creating &&
      firebase.isLoggedIn() &&
      firebase.hasUserAgreedToTerms()
    );
  }

  // 미결정이면 맥락 안에서 권한을 묻고(OB-8) 만든다. add 실패는 throw(호출측 알럿 후 머무름).
  public async autoCreate(): Promise<OnboardingTripCreateResult | null> {
    this.autoCreateStarted = true;

    try {
      await this.loadPermissionStatus();

      return await this.create(this.canAskPermission(), true);
    } finally {
      runInAction(() => {
        this.awaitingLogin = false;
      });
    }
  }

  private logLogin(result: OnboardingTripLoginResult) {
    this.loginLogged = true;
    app.getAnalyticsManager()?.logClick('onboarding_trip_login', { result });
  }

  // 로그인 왕복을 넘길 초안(OB-12) — 개인 식별 정보 없음.
  public toDraft(): OnboardingTripDraft {
    return {
      version: ONBOARDING_TRIP_DRAFT_VERSION,
      savedAt: new Date().toISOString(),
      resumable: true,
      startDate: this.startDate?.format(DRAFT_DATE_FORMAT) ?? null,
      endDate: this.endDate?.format(DRAFT_DATE_FORMAT) ?? null,
      datesUndecided: this.datesUndecided,
      location: this.location,
      catalogGears: this.getSelectedCatalogGears().map(toDraftGear),
    };
  }

  private setCreatedBagId(id: string) {
    this.createdBagId = id;
  }

  private async resolvePermission(
    askPermission: boolean
  ): Promise<OnboardingTripPermission> {
    const manager = app.getNotificationManager();

    if (
      !manager ||
      this.permissionStatus === NotificationPermissionStatus.Unavailable
    ) {
      return OnboardingTripPermission.Unavailable;
    }

    if (!this.canAskPermission()) {
      return OnboardingTripPermission.Already;
    }

    if (!askPermission) {
      return OnboardingTripPermission.Skipped;
    }

    const result = await manager.requestPermissionIfUndetermined();

    runInAction(() => {
      this.permissionStatus = result;
    });

    return result === NotificationPermissionStatus.Granted
      ? OnboardingTripPermission.Granted
      : OnboardingTripPermission.Denied;
  }
}

export default OnboardingTrip;
