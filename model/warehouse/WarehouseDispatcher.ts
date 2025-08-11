import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import GearStore from '../store/GearStore';
import app from '../app/App';
import OrderType from '../order/OrderType';
import WarehouseDispatcherType from './WarehouseDispatcherType';

class WarehouseDispatcher implements WarehouseDispatcherType {
  public static new() {
    return new WarehouseDispatcher(app.getGearStore());
  }

  private constructor(private readonly gearStore: GearStore) {}

  public async getList(filters: GearFilter[], order: OrderType): Promise<Gear[]> {
    return await this.gearStore.getList(filters, order);
  }

  public async remove(gear: Gear): Promise<void> {
    return await this.gearStore.remove(gear);
  }
}

export default WarehouseDispatcher;
