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

class WarehouseDetail {
  public static new(router: Router, dispatcher: WarehouseDispatcherType) {
    return new WarehouseDetail(
      app.getBagStore()!,
      app.getGearStore()!,
      app.getReplyStore()!,
      router,
      dispatcher,
      app.getAlertManager()!,
      app.getToastManager()!
    );
  }

  private gear: Gear | null = null;
  private bags: BagItem[] = [];
  private replies: ReplyItem[] = [];
  private initialized = false;
  private id: string = '';

  private constructor(
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly replyStore: ReplyStore,
    private readonly router: Router,
    private readonly dispatcher: WarehouseDispatcherType,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
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
    const data = await this.replyStore.getReplies(this.id);

    this.setReplies(
      data.map((item: any) =>
        ReplyItem.new(item.id, item.content, item.createDate)
      )
    );
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
}

export default WarehouseDetail;
