import { makeAutoObservable, reaction } from 'mobx';
import BagStore from '@/model/store/BagStore';
import GearStore from '@/model/store/GearStore';
import Order from '@/model/order/Order';
import Gear from '@/model/gear/Gear';
import GearFilter from '@/model/gear/GearFilter';
import OrderType from '@/model/order/OrderType';
import { Router } from 'expo-router';
import app from '@/model/app/App';

class BagUseless {
  private static readonly ORDER_KEY = 'bag';

  public static new(router: Router, id: string) {
    return new BagUseless(
      id,
      router,
      app.getBagStore()!,
      app.getGearStore()!,
      Order.new(BagUseless.ORDER_KEY)
    );
  }

  private gears: Gear[] = [];
  private selectedGears: Gear[] = [];
  private uselessGears: Gear[] = [];
  private initialized = false;
  private disposeReaction: () => void;

  private constructor(
    private readonly id: string,
    private readonly router: Router,
    private readonly bagStore: BagStore,
    private readonly gearStore: GearStore,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
    this.disposeReaction = reaction(
      () => this.order.getSelectedOrderType(),
      async () => {
        await this.fetchGears();
      }
    );
  }

  public async initialize() {
    this.order.initialize();
    const gears = await this.fetchGears();
    gears.forEach(gear => {
      if (gear.hasUseless(this.id)) {
        this.uselessGears.push(gear);
      } else if (gear.hasUsed(this.id)) {
        this.pushSelectedGear(gear);
      }
    });

    if (!this.selectedGears.length && !this.uselessGears.length) {
      this.setSelectedGears(gears);
    }

    this.setInitialized();
  }

  private async fetchGears() {
    const { gears } = await this.bagStore.getBag(
      this.id,
      [GearFilter.All],
      this.order.getSelectedOrderType() ?? OrderType.NameAsc
    );
    this.setGears(gears);

    return gears;
  }

  private pushSelectedGear(gear: Gear) {
    this.selectedGears.push(gear);
  }

  private setGears(value: Gear[]) {
    this.gears = value;
  }

  private setSelectedGears(value: Gear[]) {
    this.selectedGears = value;
  }

  private setInitialized() {
    this.initialized = true;
  }

  public isInitialized() {
    return this.initialized;
  }

  public getAllCount() {
    return this.gears.length;
  }

  public getSelectedCount() {
    return this.selectedGears.length;
  }

  public getGears() {
    return this.gears;
  }

  public isSelected(gear: Gear) {
    return this.selectedGears.some(selectedGear => selectedGear.isSame(gear));
  }

  public toggle(gear: Gear) {
    if (this.isSelected(gear)) {
      this.unselect(gear);
    } else {
      this.select(gear);
    }
  }

  private unselect(gear: Gear) {
    this.selectedGears = this.selectedGears.filter(
      selectedGear => !selectedGear.isSame(gear)
    );
    this.uselessGears.push(gear);
  }

  private select(gear: Gear) {
    this.uselessGears = this.uselessGears.filter(
      uselessGear => !uselessGear.isSame(gear)
    );
    this.selectedGears.push(gear);
  }

  public toggleSelectAll() {
    if (this.getSelectedCount() > 0) {
      this.setSelectedGears([]);
    } else {
      this.setSelectedGears(this.gears);
    }
  }

  public async save() {
    await this.gearStore.updateGears(
      this.gears.map(gear => {
        if (
          this.selectedGears.some(selectedGear => selectedGear.isSame(gear))
        ) {
          return gear.removeUseless(this.id);
        } else {
          return gear.appendUseless(this.id);
        }
      })
    );
    this.back();
  }

  public back() {
    this.router.back();
  }

  public getOrder() {
    return this.order;
  }

  public dispose() {
    this.disposeReaction();
  }
}

export default BagUseless;
