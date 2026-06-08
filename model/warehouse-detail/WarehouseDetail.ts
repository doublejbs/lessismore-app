import { makeAutoObservable } from 'mobx';
import { Router } from 'expo-router';
import WarehouseDispatcherType from '../warehouse/WarehouseDispatcherType';
import BagStore from '../store/BagStore';
import GearStore from '../store/GearStore';
import AlertManager from '../alert/AlertManager';
import ToastManager from '../toast/ToastManager';
import Gear from '../gear/Gear';
import BagItem from '../bag/BagItem';
import app from '../app/App';
import ReplyStore from '../store/ReplyStore';
import ReplyItem from '../reply/ReplyItem';
import dayjs from 'dayjs';
import Firebase from '../firebase/Firebase';
import LogInAlertManager from '../login/LogInAlertManager';
import SearchDispatcher from '../search/SearchDispatcher';
import Order from '../order/Order';
import Warehouse from '../warehouse/Warehouse';
import BagDetail from '../bag-detail/BagDetail';
import GearImageSelection from '../gear-image/GearImageSelection';
import GearImageType from '../gear/GearImageType';

class WarehouseDetail {
  public static new(router: Router, dispatcher: WarehouseDispatcherType) {
    const searchDispatcher = SearchDispatcher.new();
    const warehouseOrder = Order.new(Warehouse.ORDER_KEY);
    const bagDetailOrder = Order.new(BagDetail.ORDER_KEY);

    return new WarehouseDetail(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getReplyStore()!,
      router,
      dispatcher,
      app.getAlertManager()!,
      app.getToastManager()!,
      app.getFirebase()!,
      app.getLogInAlertManager()!,
      searchDispatcher,
      warehouseOrder,
      bagDetailOrder
    );
  }

  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private replies: ReplyItem[] = [];
  private initialized = false;
  private id: string = '';
  private showAddToBagModal = false;
  private gearImageSelection: GearImageSelection | null = null;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly replyStore: ReplyStore,
    private readonly router: Router,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly searchDispatcher: SearchDispatcher,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order
  ) {
    makeAutoObservable(this);
  }

  public async initialize(id: string) {
    try {
      this.setInitialized(false);
      this.setId(id);
      await this.getGearData();
      this.setInitialized(true);
    } catch (e) {
      window.alert(`잘못된 접근입니다. ${id} ${e}`);
    }
  }

  private async getGearData() {
    const gear = await this.gearStore.getGear(this.id);
    this.setGear(gear);
    this.setBags(await this.bagStore.getBags(this.getGear()?.getBags() ?? []));
    await this.fetchReplies();

    // 공유 이미지 기능 초기화 (isCustom === false인 경우만)
    if (gear && !gear.getIsCustom()) {
      this.gearImageSelection = GearImageSelection.new(
        this.id,
        gear.getIsCustom()
      );
      await this.gearImageSelection.loadImages();
    } else {
      this.gearImageSelection = null;
    }
  }

  public edit() {
    if (this.getGear()) {
      this.router.push(`/gear-edit/${this.getGear()?.getId()}`);
    }
  }

  public async delete(gear: Gear) {
    this.alertManager.show({
      message: `${gear.getName()}을 삭제하시겠습니까?`,
      confirmText: '삭제하기',
      onConfirm: async () => {
        await this.deleteGear(gear);
      },
    });
  }

  private async deleteGear(gear: Gear) {
    await this.dispatcher.remove(gear);
    this.toastManager.show({ message: '삭제 되었습니다.' });
    this.close();
  }

  private setGear(gear: Gear | null) {
    this.gear = gear;
  }

  public getGear() {
    return this.gear;
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public mapBags<R>(callback: (bag: BagItem) => R): R[] {
    return this.bags.map(callback);
  }

  private setInitialized(initialized: boolean) {
    this.initialized = initialized;
  }

  public isInitialized() {
    return this.initialized;
  }

  public close() {
    this.router.back();
  }

  private setId(id: string) {
    this.id = id;
  }

  public goToBag(bag: BagItem) {
    this.router.push(`/bag/${bag.getID()}`);
  }

  public async fetchReplies() {
    try {
      const data = await this.replyStore.getLatestComment(this.id);

      if (data) {
        this.setReplies([
          ReplyItem.new(data.id, data.content, dayjs(data.createdAt)),
        ]);
      }
    } catch (error) {
      console.error(error);
    }
  }

  private setReplies(value: ReplyItem[]) {
    this.replies = value;
  }

  public getReplies() {
    return this.replies;
  }

  public hasReplies() {
    return this.replies.length > 0;
  }

  public replyCount() {
    return this.replies.length;
  }

  public getId() {
    return this.id;
  }

  public goToReply() {
    if (this.firebase.isLoggedIn()) {
      this.router.push(`/reply/${this.getId()}`);
    } else {
      this.logInAlertManager.show();
    }
  }

  public async addToWarehouse(gear: Gear): Promise<boolean> {
    if (!this.firebase.isLoggedIn()) {
      this.logInAlertManager.show();
      return false;
    }

    await this.searchDispatcher.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();
    this.toastManager.show({ message: '장비가 추가되었습니다.' });
    this.setShowAddToBagModal(true);

    await this.initialize(this.getId());

    return true;
  }

  private setShowAddToBagModal(value: boolean) {
    this.showAddToBagModal = value;
  }

  public shouldShowAddToBagModal() {
    return this.showAddToBagModal;
  }

  public async closeAddToBagModal() {
    this.setShowAddToBagModal(false);
    await this.initialize(this.getId());
  }

  public getGearImageSelection() {
    return this.gearImageSelection;
  }

  public async selectSharedImage(image: GearImageType): Promise<void> {
    if (!this.gear) return;

    // 사용자의 장비 imageUrl을 선택한 이미지로 업데이트
    const updatedGear = new Gear(
      this.gear.getId(),
      this.gear.getName(),
      this.gear.getCompany(),
      this.gear.getWeight(),
      image.url,
      this.gear.isAdded(),
      this.gear.getIsCustom(),
      this.gear.getCategory(),
      this.gear.getUseless(),
      this.gear.getUsed(),
      this.gear.getBags(),
      this.gear.getCreateDate(),
      this.gear.getColor(),
      this.gear.getCompanyKorean(),
      this.gear.getNameKorean()
    );

    await this.gearStore.update(updatedGear);
    this.setGear(updatedGear);
    this.gearImageSelection?.hideModal();
    this.toastManager.show({ message: '이미지가 변경되었습니다.' });
  }
}

export default WarehouseDetail;
