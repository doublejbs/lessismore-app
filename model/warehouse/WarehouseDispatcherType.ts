import Gear from '../gear/Gear';
import GearFilter from '../gear/GearFilter';
import OrderType from '../order/OrderType';

interface WarehouseDispatcherType {
  getList(filters: GearFilter[], order: OrderType): Promise<Gear[]>;
  remove(gear: Gear): Promise<void>;
}

export default WarehouseDispatcherType;
