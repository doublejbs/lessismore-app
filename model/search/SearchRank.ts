import { makeAutoObservable, action } from 'mobx';
import { Router } from 'expo-router';
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
    private readonly router: Router
  ) {
    makeAutoObservable(this);
  }

  public async loadRanking(category: GearFilter, loading = true) {
    if (loading) {
      this.setLoading(true);
    }
    this.setSelectedCategory(category);

    try {
      await this.loadRankingAsGears(category);
    } catch (error) {
      console.error('Error in SearchRank.loadRanking:', error);
      this.setGears([]);
    } finally {
      this.setLoading(false);
    }
  }

  private async loadRankingAsGears(category: GearFilter) {
    const gears = await this.gearRankStore.loadRankingAsGears(category);
    this.setGears(gears);
  }

  public selectCategory(category: GearFilter) {
    this.loadRanking(category);
  }

  @action
  private setGears(gears: Gear[]) {
    this.gears = gears;
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
    await this.loadRankingAsGears(this.selectedCategory);
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
        await this.loadRankingAsGears(this.selectedCategory);
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
