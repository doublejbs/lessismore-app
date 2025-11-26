import { makeAutoObservable, action } from 'mobx';
import GearRankStore from './GearRankStore';
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
  private gearCountMap: Map<string, number> = new Map();
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
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
  }

  public async loadRanking(category: GearFilter, loading = true) {
    if (loading) {
      this.setLoading(true);
    }
    this.setSelectedCategory(category);

    try {
      const data = await this.gearRankStore.loadRanking(category);

      const countMap = new Map<string, number>();
      data.forEach(item => {
        countMap.set(item.id, item.count);
      });
      this.setGearCountMap(countMap);

      const gears = await this.gearRankStore.loadRankingAsGears(category);
      this.setGears(gears);
    } catch (error) {
      console.error('Error in SearchRank.loadRanking:', error);
      this.setGearCountMap(new Map());
      this.setGears([]);
    } finally {
      this.setLoading(false);
    }
  }

  public selectCategory(category: GearFilter) {
    this.loadRanking(category);
  }

  @action
  private setGears(gears: Gear[]) {
    this.gears = gears;
  }

  @action
  private setGearCountMap(map: Map<string, number>) {
    this.gearCountMap = map;
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

  public getGearCount(gearId: string): number {
    return this.gearCountMap.get(gearId) || 0;
  }

  public isLoading() {
    return this.loading;
  }

  public getSelectedCategory() {
    return this.selectedCategory;
  }

  public async registerSingle(gear: Gear) {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();

    // 랭킹 목록을 다시 불러와서 isAdded 상태 업데이트
    await this.loadRanking(this.selectedCategory, false);
  }

  public async removeSingle(gear: Gear) {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return;
    }

    this.alertManager.show({
      message: '모든 배낭에서 장비가 제거됩니다.\n정말 제거하시겠습니까?',
      confirmText: '확인',
      onConfirm: async () => {
        await this.searchDispatcher.remove(gear);
        await this.warehouseOrder.saveLastOrderOption();
        await this.bagDetailOrder.saveLastOrderOption();

        // 랭킹 목록을 다시 불러와서 isAdded 상태 업데이트
        await this.loadRanking(this.selectedCategory, false);
        this.toastManager.show({ message: '장비가 제거되었습니다.' });
      },
    });
  }
}

export default SearchRank;
