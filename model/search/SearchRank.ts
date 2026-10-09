import { makeAutoObservable, action } from 'mobx';
import { ImperativeRouter } from 'expo-router';
import GearRankStore from './GearRankStore';
import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import SearchDispatcherType from './SearchDispatcherType';
import Firebase from '../firebase/Firebase';
import LogInAlertManager from '../login/LogInAlertManager';
import Order from '../order/Order';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import app from '@/model/app/App';

class SearchRank {
  private gears: Gear[] = [];
  private loading = false;
  private hasLoadedOnce = false;
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
      const gears = await this.gearRankStore.loadRankingAsGears(category);

      // 카테고리를 빠르게 바꾸면 이전 요청이 나중에 끝날 수 있다 — 지금 선택과 다른 응답은 버린다(FD-6).
      if (this.selectedCategory !== category) {
        return;
      }

      this.setGears(gears);
    } catch (error) {
      console.error('Error in SearchRank.loadRanking:', error);

      if (this.selectedCategory !== category) {
        return;
      }

      this.setGears([]);
    } finally {
      if (this.selectedCategory === category) {
        this.setLoaded();
        this.setLoading(false);
      }
    }
  }

  // 담기·제거 뒤 같은 카테고리를 조용히 다시 읽는 경로(registerSingle/removeSingle)용.
  private async loadRankingAsGears(category: GearFilter) {
    const gears = await this.gearRankStore.loadRankingAsGears(category);

    // 담는 사이 카테고리가 바뀌었으면 이전 카테고리 목록으로 덮어쓰지 않는다.
    if (this.selectedCategory !== category) {
      return;
    }

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
  private setLoaded() {
    this.hasLoadedOnce = true;
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

  // 한 번도 로드하지 않은 초기 상태를 로딩과 구분하지 않고 '아직 없음'으로 보이게 하기 위한 플래그(FD-6).
  public hasLoaded() {
    return this.hasLoadedOnce;
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
      message: app.getL10n().t('search.removeConfirm'),
      confirmText: app.getL10n().t('common.confirm'),
      onConfirm: async () => {
        await this.searchDispatcher.remove(gear);
        await this.warehouseOrder.saveLastOrderOption();
        await this.bagDetailOrder.saveLastOrderOption();

        // 랭킹 목록을 다시 불러와서 isAdded 상태 업데이트
        await this.loadRankingAsGears(this.selectedCategory);
        this.toastManager.show({
          message: app.getL10n().t('search.removed'),
        });
      },
    });
    return true;
  }

  public goToGearDetail(gear: Gear) {
    this.router.push(`/gear-detail/${gear.getId()}`);
  }
}

export default SearchRank;
