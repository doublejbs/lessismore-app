import dayjs from 'dayjs';
import { makeAutoObservable } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import app from '@/model/app/App';
import BagStore from '@/model/store/BagStore';
import Gear from '@/model/gear/Gear';
import BagDetailFilterManager from '@/model/bag-detail/BagDetailFilterManager';
import AnalyticsManager from '@/model/analytics/AnalyticsManager';

const SAVE_DEBOUNCE_MS = 800;

class BagPacking {
  public static from(router: ImperativeRouter, id: string) {
    return new BagPacking(
      router,
      id,
      app.getBagStore()!,
      BagDetailFilterManager.from(),
      app.getAnalyticsManager()
    );
  }

  private name = '';
  private weight = 0;
  private gears: Gear[] = [];
  private packedIds = new Set<string>();
  private startDate = dayjs();
  private packingStartedAt: string | undefined;
  private packingCompletedAt: string | undefined;
  private initialized = false;
  private completeCardDismissed = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSave = false;

  private constructor(
    private readonly router: ImperativeRouter,
    private readonly id: string,
    private readonly bagStore: BagStore,
    private readonly filterManager: BagDetailFilterManager,
    private readonly analyticsManager: AnalyticsManager | null
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    await this.loadBag();
    await this.startPackingIfNeeded();
    this.setInitialized(true);
  }

  private async loadBag() {
    const { name, weight, gears, startDate } =
      await this.bagStore.getBagWithAllFilter(this.id);
    const { packedGears, packingStartedAt, packingCompletedAt } =
      await this.bagStore.getPackingState(this.id);

    this.setName(name);
    this.setWeight(Number(weight));
    this.setGears(gears);
    this.setStartDate(startDate);
    this.setPackedIds(new Set(packedGears));
    this.setPackingStartedAt(packingStartedAt);
    this.setPackingCompletedAt(packingCompletedAt);
  }

  // 패킹 기록이 없는 배낭(장비가 있는)에서 진입하면 최초 시작 시각을 기록한다.
  private async startPackingIfNeeded() {
    if (this.packingStartedAt || this.gears.length === 0) {
      return;
    }

    const startedAt = new Date().toISOString();

    this.setPackingStartedAt(startedAt);
    await this.bagStore.savePacking(this.id, this.getPackedIdsArray(), {
      packingStartedAt: startedAt,
    });
  }

  private setName(value: string) {
    this.name = value;
  }

  public getName() {
    return this.name;
  }

  private setWeight(value: number) {
    this.weight = value;
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  private setStartDate(value: string) {
    this.startDate = dayjs(value);
  }

  private setPackedIds(value: Set<string>) {
    this.packedIds = value;
  }

  private setPackingStartedAt(value: string | undefined) {
    this.packingStartedAt = value;
  }

  private setPackingCompletedAt(value: string | undefined) {
    this.packingCompletedAt = value;
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public isInitialized() {
    return this.initialized;
  }

  public isEmpty() {
    return this.gears.length === 0;
  }

  // 카테고리별 그룹핑 — 배낭 상세(BD-1)와 동일 규칙(비어 있지 않은 카테고리만).
  public getGearsByCategory() {
    return this.filterManager.groupGearsByCategory(this.gears);
  }

  public isPacked(gear: Gear) {
    return this.packedIds.has(gear.getId());
  }

  public togglePacked(gear: Gear) {
    const gearId = gear.getId();
    const nextPacked = !this.packedIds.has(gearId);

    if (nextPacked) {
      this.packedIds.add(gearId);
    } else {
      this.packedIds.delete(gearId);
    }

    this.analyticsManager?.logClick('packing_toggle', { packed: nextPacked });

    this.updateCompletionState();
    this.scheduleSave();
  }

  // 로드된 장비 기준으로 챙긴 개수를 센다(stale ID는 무시).
  public getPackedCount() {
    return this.gears.reduce(
      (acc, gear) => (this.packedIds.has(gear.getId()) ? acc + 1 : acc),
      0
    );
  }

  public getTotalCount() {
    return this.gears.length;
  }

  public getProgressPercent() {
    const total = this.getTotalCount();

    if (total === 0) {
      return 0;
    }

    return Math.round((this.getPackedCount() / total) * 100);
  }

  // 챙긴 장비 무게 합의 저장값(g). 표시 서식은 헤더가 `formatBagWeight()`로 만든다(DM-26).
  public getPackedWeightGram() {
    return this.gears.reduce(
      (acc, gear) =>
        this.packedIds.has(gear.getId())
          ? acc + Number(gear.getWeight() || 0)
          : acc,
      0
    );
  }

  // 배낭 총 무게의 저장값(g).
  public getTotalWeightGram() {
    return this.weight;
  }

  public isComplete() {
    const total = this.getTotalCount();

    return total > 0 && this.getPackedCount() === total;
  }

  // 출발까지 남은 일수(지났으면 음수). 오늘 대비 시작일 일수 차이.
  public getDDay() {
    return this.startDate.startOf('day').diff(dayjs().startOf('day'), 'day');
  }

  // 출발일이 지나지 않았을 때만 남은 일수를 노출(PK-5).
  public hasUpcomingDeparture() {
    return this.getDDay() >= 0;
  }

  private updateCompletionState() {
    if (this.isComplete()) {
      if (!this.packingCompletedAt) {
        this.setPackingCompletedAt(new Date().toISOString());
        // 새로 완료에 도달하면 닫았던 완료 카드를 다시 노출한다(PK-5).
        this.setCompleteCardDismissed(false);
        this.logComplete();
      }
    } else {
      if (this.packingCompletedAt) {
        this.setPackingCompletedAt(undefined);
      }
    }
  }

  // 완료 카드는 완료 상태이고 사용자가 닫지 않았을 때만 노출한다(PK-5).
  public shouldShowCompleteCard() {
    return this.isComplete() && !this.completeCardDismissed;
  }

  // 완료 카드 `닫기` — 카드만 닫고 패킹 화면에 남는다(PK-5).
  public dismissCompleteCard() {
    this.setCompleteCardDismissed(true);
  }

  private setCompleteCardDismissed(value: boolean) {
    this.completeCardDismissed = value;
  }

  private logComplete() {
    const durationSeconds = this.packingStartedAt
      ? Math.max(
          0,
          Math.round(
            (Date.now() - dayjs(this.packingStartedAt).valueOf()) / 1000
          )
        )
      : 0;

    this.analyticsManager?.logClick('packing_complete', {
      gear_count: this.getTotalCount(),
      duration_seconds: durationSeconds,
      d_day: this.getDDay(),
    });
  }

  private getPackedIdsArray() {
    return Array.from(this.packedIds);
  }

  private scheduleSave() {
    this.pendingSave = true;

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    this.saveTimer = setTimeout(() => {
      void this.flush();
    }, SAVE_DEBOUNCE_MS);
  }

  // 미저장분을 즉시 저장한다(이탈·완료·언마운트 시점).
  public async flush() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    if (!this.pendingSave) {
      return;
    }

    this.pendingSave = false;

    try {
      if (this.isComplete()) {
        await this.bagStore.savePacking(this.id, this.getPackedIdsArray(), {
          ...(this.packingCompletedAt !== undefined
            ? { packingCompletedAt: this.packingCompletedAt }
            : {}),
        });
      } else {
        await this.bagStore.savePacking(this.id, this.getPackedIdsArray(), {
          removePackingCompletedAt: true,
        });
      }
    } catch (e) {
      // 저장 실패는 앱 동작을 막지 않는다(오프라인 persistence로 재접속 시 동기화).
      console.warn('패킹 상태 저장 실패', e);
    }
  }

  // 헤더 메뉴 `처음부터 다시` — packedGears 비우고 packingCompletedAt 제거.
  public async reset() {
    this.setPackedIds(new Set());
    this.setPackingCompletedAt(undefined);

    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }

    this.pendingSave = false;

    try {
      await this.bagStore.savePacking(this.id, [], {
        removePackingCompletedAt: true,
      });
    } catch (e) {
      console.warn('패킹 초기화 저장 실패', e);
    }
  }

  public getId() {
    return this.id;
  }

  public async close() {
    await this.flush();
    this.back();
  }

  // 미완료 상태로 화면을 이탈할 때 진행률 로그를 남긴다(PK-4).
  public logExitIfIncomplete() {
    if (!this.isComplete()) {
      this.analyticsManager?.logClick('packing_exit', {
        progress_percent: this.getProgressPercent(),
      });
    }
  }

  public back() {
    this.router.back();
  }
}

export default BagPacking;
