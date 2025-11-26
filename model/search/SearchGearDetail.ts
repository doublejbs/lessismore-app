import { makeAutoObservable } from 'mobx';
import { router, Router } from 'expo-router';
import WarehouseDetail from '../warehouse-detail/WarehouseDetail';
import WarehouseDispatcherType from '../warehouse/WarehouseDispatcherType';
import Gear from '../gear/Gear';
import BagItem from '../bag/BagItem';
import SearchDispatcher from './SearchDispatcher';
import SearchDispatcherType from './SearchDispatcherType';
import Firebase from '../firebase/Firebase';
import LogInAlertManager from '../login/LogInAlertManager';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';
import BagDetail from '../bag-detail/BagDetail';
import app from '../app/App';

class SearchGearDetail {
  public static new(router: Router, dispatcher: WarehouseDispatcherType) {
    const firebase = app.getFirebase();
    const searchDispatcher = SearchDispatcher.new();
    const logInAlertManager = app.getLogInAlertManager()!;
    const warehouseOrder = Order.new(Warehouse.ORDER_KEY);
    const bagDetailOrder = Order.new(BagDetail.ORDER_KEY);
    const alertManager = app.getAlertManager()!;
    const toastManager = app.getToastManager()!;

    return new SearchGearDetail(
      WarehouseDetail.new(router, dispatcher),
      searchDispatcher,
      firebase,
      logInAlertManager,
      warehouseOrder,
      bagDetailOrder,
      alertManager,
      toastManager
    );
  }

  private showAddToBagModal = false;

  private constructor(
    private readonly warehouseDetail: WarehouseDetail,
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

  public async initialize(id: string) {
    await this.warehouseDetail.initialize(id);
  }

  public getWarehouseDetail() {
    return this.warehouseDetail;
  }

  public getGear() {
    return this.warehouseDetail.getGear();
  }

  public isInitialized() {
    return this.warehouseDetail.isInitialized();
  }

  public close() {
    this.warehouseDetail.close();
  }

  public mapBags<R>(callback: (bag: BagItem) => R): R[] {
    return this.warehouseDetail.mapBags(callback);
  }

  public goToBag(bag: BagItem) {
    this.warehouseDetail.goToBag(bag);
  }

  public getReplies() {
    return this.warehouseDetail.getReplies();
  }

  public hasReplies() {
    return this.warehouseDetail.hasReplies();
  }

  public replyCount() {
    return this.warehouseDetail.replyCount();
  }

  public getId() {
    return this.warehouseDetail.getId();
  }

  public async registerSingle(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    } else {
      await this.searchDispatcher.register([gear]);
      await this.warehouseOrder.saveLastOrderOption();
      await this.bagDetailOrder.saveLastOrderOption();
      this.setShowAddToBagModal(true);
      this.toastManager.show({ message: '장비가 추가되었습니다.' });

      return true;
    }
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
        this.toastManager.show({ message: '장비가 제거되었습니다.' });

        // gear의 isAdded 상태 업데이트를 위해 다시 초기화
        await this.warehouseDetail.initialize(this.getId());
      },
    });
    return true;
  }

  private setShowAddToBagModal(value: boolean) {
    this.showAddToBagModal = value;
  }

  public shouldShowAddToBagModal() {
    return this.showAddToBagModal;
  }

  public closeAddToBagModal() {
    this.setShowAddToBagModal(false);
    router.replace(`/gear-detail/${this.getGear()?.getId()}`);
  }
}

export default SearchGearDetail;
