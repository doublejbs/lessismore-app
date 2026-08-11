import { makeAutoObservable, action } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import GearRankStore, { RankedGear } from './GearRankStore';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import SearchDispatcherType from './SearchDispatcherType';
import Firebase from '../firebase/Firebase';
import LogInAlertManager from '../login/LogInAlertManager';
import Order from '../order/Order';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';

class SearchRank {
  private gears: Gear[] = [];
  /** 장비 id → 담은 횟수(`gear-rank.count`). 순위 근거를 행에 한 줄로 노출한다(SR-4). */
  private counts = new Map<string, number>();
  private loading = false;
  private selectedCategory: GearFilter = GearFilter.All;

  public constructor(
    private readonly gearRankStore: GearRankStore,
    private readonly searchDispatcher: SearchDispatcherType,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly router: ImperativeRouter
  ) {
    makeAutoObservable(this);
  }

  public async loadRanking(category: GearFilter, loading = true) {
    if (loading) {
      this.setLoading(true);
    }
    this.setSelectedCategory(category);

    try {
      await this.loadRanked(category);
    } catch (error) {
      console.error('Error in SearchRank.loadRanking:', error);
      this.setRanked([]);
    } finally {
      this.setLoading(false);
    }
  }

  private async loadRanked(category: GearFilter) {
    const ranked = await this.gearRankStore.loadRankedGears(category);
    this.setRanked(ranked);
  }

  public selectCategory(category: GearFilter) {
    this.loadRanking(category);
  }

  @action
  private setRanked(ranked: RankedGear[]) {
    this.gears = ranked.map(item => item.gear);
    // 화면은 장비 목록을 순서대로 그리고 지표만 id로 집어 오므로 짝을 맵으로 눕힌다.
    this.counts = new Map(
      ranked.map(item => [item.gear.getId(), item.count] as const)
    );
  }

  @action
  private setLoading(value: boolean) {
    this.loading = value;
  }

  @action
  private setSelectedCategory(category: GearFilter) {
    this.selectedCategory = category;
  }

  public getGears() {
    return this.gears;
  }

  /**
   * 이 장비를 담은 사람 수(SR-4 순위 근거). 순위에 없는 장비·아직 못 받은 상태는 0이며,
   * 화면은 0을 노출하지 않는다 — 0으로 적으면 틀린 사실이 된다.
   */
  public getCount(gearId: string) {
    return this.counts.get(gearId) ?? 0;
  }

  public isLoading() {
    return this.loading;
  }

  public getSelectedCategory() {
    return this.selectedCategory;
  }

  public async registerSingle(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 랭킹 목록을 다시 불러와서 isAdded 상태 업데이트
    await this.loadRanked(this.selectedCategory);
    return true;
  }

  public async removeSingle(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    this.alertManager.show({
      message: '모든 배낭에서 장비가 제거됩니다.\n정말 제거하시겠습니까?',
      confirmText: '확인',
      onConfirm: async () => {
        await this.searchDispatcher.remove(gear);
        await this.warehouseOrder.saveLastOrderOption();
        await this.bagDetailOrder.saveLastOrderOption();

        // 랭킹 목록을 다시 불러와서 isAdded 상태 업데이트
        await this.loadRanked(this.selectedCategory);
        this.toastManager.show({ message: '장비가 제거되었습니다.' });
      },
    });
    return true;
  }

  public goToGearDetail(gear: Gear) {
    this.router.push(`/gear-detail/${gear.getId()}`);
  }
}

export default SearchRank;
