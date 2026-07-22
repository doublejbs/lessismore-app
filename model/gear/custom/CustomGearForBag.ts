import { ImperativeRouter } from 'expo-router';
import CustomGear from './CustomGear';
import CustomGearCategory from './CustomGearCategory';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import Order from '@/model/order/Order';
import Warehouse from '@/model/warehouse/Warehouse';
import BagDetail from '@/model/bag-detail/BagDetail';

class CustomGearForBag extends CustomGear {
  public static newForBag(navigate: ImperativeRouter, bagId: string) {
    return new CustomGearForBag(navigate, bagId);
  }

  private constructor(navigate: ImperativeRouter, private readonly bagId: string) {
    super(
      navigate,
      app.getGearStore()!,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      Order.new(Warehouse.ORDER_KEY),
      Order.new(BagDetail.ORDER_KEY),
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      '',
      ''
    );
  }

  public override async _register(): Promise<Gear> {
    const gear = await super._register();

    await app.getBagStore()!.addGear(this.bagId, gear);

    return gear;
  }
}

export default CustomGearForBag;
