import dayjs, { Dayjs } from 'dayjs';
import { makeAutoObservable, runInAction } from 'mobx';
import app from '../app/App';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import { getGroupForCategory } from '../gear/GearCategoryGroups';
import { getGearFilterName } from '../gear/GearFilterName';
import OrderType from '../order/OrderType';
import { BagLocation } from '../bag-destination/BagLocation';
import { saveBagDestination } from '../bag-destination/BagDestinationSave';
import { FALLBACK_LOCATION_NAME } from '../bag-destination/GeocodeService';
import { getUpcomingWeekend } from '../bag/QuickBagDefaults';
import NotificationPermissionStatus from '../notification/NotificationPermissionStatus';
import OnboardingTripStep from './OnboardingTripStep';
import OnboardingTripAction from './OnboardingTripAction';
import OnboardingTripGearMode from './OnboardingTripGearMode';
import OnboardingTripPermission from './OnboardingTripPermission';
import OnboardingTripStatus from './OnboardingTripStatus';

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

// 창고가 비어 있을 때 검색으로 담게 하는 필수 카테고리(OB-6).
export const REQUIRED_GEAR_GROUPS: GearFilter[] = [
  GearFilter.Tent,
  GearFilter.SleepingBag,
  GearFilter.Mat,
  GearFilter.Backpack,
];

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
  public static new() {
    return new OnboardingTrip();
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
  private permissionStatus: NotificationPermissionStatus | null = null;
  private creating = false;
  // add 성공 후 보관 — 재시도해도 여행이 두 개 생기지 않는다(OB-7).
  private createdBagId: string | null = null;

  private constructor() {
    makeAutoObservable(this);
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
          : OnboardingTripGearMode.Search;
    } else {
      const known = new Set(this.knownGearIds);
      const added = ids.filter(id => !known.has(id));

      // 검색으로 방금 창고에 담은 장비는 이 여행에도 담는다(OB-6).
      this.selectedGearIds = [...this.selectedGearIds, ...added];
      this.knownGearIds = ids;
    }

    // 창고에서 사라진 장비는 선택에서도 뺀다.
    const present = new Set(ids);

    this.selectedGearIds = this.selectedGearIds.filter(id => present.has(id));
    this.warehouseGears = gears;
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

  public getGearsInGroup(group: GearFilter): Gear[] {
    return this.warehouseGears.filter(
      gear => getGroupForCategory(gear.getCategory()) === group
    );
  }

  // 필수 4종 밖의 카테고리로 담은 장비(검색 모드에서 필터를 바꿔 담은 경우).
  public getOtherGears(): Gear[] {
    const required = new Set<string>(REQUIRED_GEAR_GROUPS);

    return this.warehouseGears.filter(
      gear => !required.has(getGroupForCategory(gear.getCategory()))
    );
  }

  public isGearSelected(gear: Gear): boolean {
    return this.selectedGearIds.includes(gear.getId());
  }

  public toggleGear(gear: Gear): void {
    const id = gear.getId();

    this.selectedGearIds = this.selectedGearIds.includes(id)
      ? this.selectedGearIds.filter(selected => selected !== id)
      : [...this.selectedGearIds, id];
  }

  public getSelectedGears(): Gear[] {
    const selected = new Set(this.selectedGearIds);

    return this.warehouseGears.filter(gear => selected.has(gear.getId()));
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
    askPermission: boolean
  ): Promise<OnboardingTripCreateResult | null> {
    const bagStore = app.getBagStore();

    if (this.creating || !bagStore) {
      return null;
    }

    this.creating = true;

    try {
      this.logStep(
        OnboardingTripStep.Done,
        askPermission || !this.canAskPermission()
          ? OnboardingTripAction.Next
          : OnboardingTripAction.Skip
      );

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

      const gears = this.getSelectedGears();

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
