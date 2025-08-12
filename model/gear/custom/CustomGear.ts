import { makeObservable } from 'mobx';
import app from '@/model/app/App';
import GearStore from '@/model/store/GearStore';
import Gear from '@/model/gear/Gear';
import CustomGearCategory from './CustomGearCategory';
import Firebase from '@/model/firebase/Firebase';
import LogInAlertManager from '@/model/login/LogInAlertManager';
import AbstractGearEdit from '../AbstractGearEdit';
import { Router } from 'expo-router';

class CustomGear extends AbstractGearEdit {
  public static new(navigate: Router) {
    return new CustomGear(
      navigate,
      app.getGearStore()!,
      app.getFirebase(),
      app.getLogInAlertManager()!,
      CustomGearCategory.new().selectFirst(),
      '',
      '',
      '',
      ''
    );
  }

  protected constructor(
    private readonly navigate: Router,
    private readonly gearStore: GearStore,
    private readonly firebase: Firebase,
    private readonly logInAlertManager: LogInAlertManager,
    category: CustomGearCategory,
    name: string,
    company: string,
    weight: string,
    color: string
  ) {
    super(category, name, company, weight, color);
    makeObservable(this);
  }

  public async initialize() {
    if (!this.isLoggedIn()) {
      this.logInAlertManager.show();
    }
  }

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
      this.getCompany()
    );

    await this.gearStore.register([gear]);

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
