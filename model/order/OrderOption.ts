import { makeAutoObservable } from 'mobx';
import OrderType from './OrderType';
import app from '@/model/app/App';

class OrderOption {
  public static from(name: string, order: OrderType) {
    return new OrderOption(name, order);
  }

  public static fromKey(nameKey: string, order: OrderType) {
    return new OrderOption('', order, nameKey);
  }

  private selected = false;

  private constructor(
    private name: string,
    private order: OrderType,
    private readonly nameKey?: string
  ) {
    makeAutoObservable(this);
  }

  public getName() {
    return this.nameKey ? app.getL10n().t(this.nameKey) : this.name;
  }

  public getOrder() {
    return this.order;
  }

  public isSelected() {
    return this.selected;
  }

  public select() {
    this.selected = true;
  }

  public deselect() {
    this.selected = false;
  }

  public equals(orderOption: OrderOption) {
    return this.getOrder() === orderOption.getOrder();
  }
}

export default OrderOption;
