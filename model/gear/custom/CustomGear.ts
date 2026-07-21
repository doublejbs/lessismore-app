import app from '@/model/app/App';
import GearStore from '@/model/store/GearStore';
import Gear from '@/model/gear/Gear';
import CustomGearCategory from './CustomGearCategory';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import AbstractGearEdit from '../AbstractGearEdit';
import { ImperativeRouter } from 'expo-router';
import Order from '@/model/order/Order';
import Warehouse from '@/model/warehouse/Warehouse';
import BagDetail from '@/model/bag-detail/BagDetail';

class CustomGear extends AbstractGearEdit {
  public static new(navigate: ImperativeRouter) {
    return new CustomGear(
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

  protected constructor(
    private readonly navigate: ImperativeRouter,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    private readonly warehouseOrder: Order,
    private readonly bagDetailOrder: Order,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super(category, name, company, weight, color);
  }

  public async initialize() {
    if (!this.isLoggedIn()) {
      this.logInAlertManager.show();
    }
  }

  // 수동 폼은 항상 커스텀 장비를 생성한다(GE-2 폐기 — 카탈로그 검색·프리필 경로 없음).
  // 카탈로그 등록은 장비 추가 검색 플로우(GE-8)가 담당한다.
  public async _register() {
    const gear = new Gear(
      this.generateId(),
      this.getName(),
      this.getCompany(),
      this.getWeight(),
      await this.getFileUrl(),
      true,
      true,
      this.getSelectedFilter(),
      [],
      [],
      [],
      Date.now(),
      this.getColor(),
      this.getCompany(),
      this.getName()
    );

    await this.gearStore.register([gear]);
    await this.warehouseOrder.saveLastOrderOption();
    await this.bagDetailOrder.saveLastOrderOption();
    app.getAnalyticsManager()?.logClick('gear_save', { mode: 'create' });

    return gear;
  }

  public getFileName(): string {
    return `${this.getName()}${this.getCompany()}${this.getWeight()}`;
  }

  public override hide() {
    this.navigate.back();
  }

  public isLoggedIn() {
    return this.firebase.isLoggedIn();
  }
}

export default CustomGear;
