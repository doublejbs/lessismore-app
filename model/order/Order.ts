import { makeAutoObservable } from 'mobx';
import OrderType from './OrderType';
import OrderOption from './OrderOption';
import LocalStorageManager from '../storage/LocalStorageManager';
import { createGearOrderOptions } from './GearOrderOptions';

class Order {
  /**
   * options를 넘기지 않으면 장비 목록 기본 옵션을 쓴다.
   * OrderOption은 선택 상태를 갖는 observable이라 상수 배열을 공유하면 Order 인스턴스끼리
   * 선택이 섞인다 — 옵션은 항상 `create*OrderOptions` 팩토리로 새 배열을 만들어 넘긴다.
   */
  public static new(key: string, options?: OrderOption[]) {
    return new Order(key, options ?? createGearOrderOptions());
  }

  private constructor(
    private readonly key: string,
    private readonly orderOptions: OrderOption[]
  ) {
    makeAutoObservable(this);
    this.orderOptions[0].select();
  }

  private getStorageKey() {
    return `selectedOrderType_${this.key}`;
  }

  public async initialize() {
    const saved = await LocalStorageManager.get<OrderType>(
      this.getStorageKey()
    );
    if (saved) {
      const option = this.orderOptions.find(opt => opt.getOrder() === saved);
      if (option) {
        this.setOrderOption(option);
        return;
      }
    } else {
      this.orderOptions[0].select();
    }
  }

  public getSelectedOrderName() {
    return this.orderOptions.find(option => option.isSelected())?.getName();
  }

  public mapOrderOptions<R>(callback: (option: OrderOption) => R) {
    return this.orderOptions.map(callback);
  }

  public selectLastOrderOption() {
    this.setOrderOption(this.getLastOrderOption());
  }

  public async saveLastOrderOption() {
    await LocalStorageManager.set(
      this.getStorageKey(),
      this.getLastOrderOption().getOrder()
    );
  }

  public setOrderOption(orderOption: OrderOption) {
    this.orderOptions.forEach(option => option.deselect());
    this.orderOptions.find(option => option.equals(orderOption))?.select();
    LocalStorageManager.set(this.getStorageKey(), orderOption.getOrder());
  }

  public getSelectedOrderType() {
    return this.orderOptions.find(option => option.isSelected())?.getOrder();
  }

  private getLastOrderOption() {
    return this.orderOptions[this.orderOptions.length - 1];
  }
}

export default Order;
