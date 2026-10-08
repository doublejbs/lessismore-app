import { ImperativeRouter } from 'expo-router';
import CustomGear from './CustomGear';
import CustomGearCategory from './CustomGearCategory';
import app from '@/model/app/App';
import Gear from '@/model/gear/Gear';
import Order from '@/model/order/Order';
import Warehouse from '@/model/warehouse/Warehouse';
import BagDetail from '@/model/bag-detail/BagDetail';

class CustomGearForBag extends CustomGear {
  // `name`: 배낭 검색 결과 없음 `직접 추가`(SR-11)의 제품명 프리필.
  public static newForBag(navigate: ImperativeRouter, bagId: string, name = '') {
    return new CustomGearForBag(navigate, bagId, name);
  }

  private constructor(
    navigate: ImperativeRouter,
    private readonly bagId: string,
    name: string
  ) {
    super(
      navigate,
      app.getGearStore()!,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      Order.new(Warehouse.ORDER_KEY),
      Order.new(BagDetail.ORDER_KEY),
      CustomGearCategory.new().selectFirst(),
      name.trim(),
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
