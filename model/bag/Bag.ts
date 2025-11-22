import BagItem from '@/model/bag/BagItem';
import { makeAutoObservable, reaction } from 'mobx';
import app from '@/model/app/App';
import BagStore from '@/model/store/BagStore';
import { Dayjs } from 'dayjs';
import Firebase from '@/model/firebase/Firebase';
import { Alert } from 'react-native';
import AlertManager from '@/model/alert/AlertManager';
import ToastManager from '@/model/toast/ToastManager';
import Gear from '@/model/gear/Gear';
import { router } from 'expo-router';

class Bag {
  public static new() {
    return new Bag(
      app.getBagStore()!,
      app.getFirebase(),
      app.getAlertManager()!,
      app.getToastManager()!
    );
  }

  private bags: BagItem[] = [];
  private loading = false;
  private disposeLoginReaction: () => void;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly firebase: Firebase,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.getList();
      }
    );
  }

  public async getList() {
    if (this.firebase.isLoggedIn()) {
      this.setLoading(true);
      this.setBags(await this.bagStore.getList());
      this.setLoading(false);
    } else {
      this.setBags([]);
    }
  }

  private setBags(value: BagItem[]) {
    this.bags = value;
  }

  public async add(name: string, startDate: Dayjs, endDate: Dayjs) {
    const trimmedValue = name.trim();

    if (trimmedValue.length) {
      return await this.bagStore.add(trimmedValue, startDate, endDate);
    } else {
      Alert.alert('배낭 이름을 입력해주세요');
      return '';
    }
  }

  public async delete(bagItem: BagItem) {
    this.alertManager.show({
      message: `${bagItem.getName()} 배낭을 삭제할까요?`,
      confirmText: '삭제',
      onConfirm: async () => {
        await this.bagStore.delete(bagItem.getID());
        await this.getList();
      },
    });
  }

  public async addGearToBag(bagItemId: string, gear: Gear): Promise<boolean> {
    if (gear.getData().bags.includes(bagItemId)) {
      return false;
    }

    await this.bagStore.addGear(bagItemId, gear);

    const bagItem = this.bags.find(bag => bag.getID() === bagItemId);
    if (bagItem) {
      this.toastManager.show({
        message: '배낭에 추가됐습니다.',
        buttonText: '배낭 보기',
        onButtonPress: () => {
          router.push(`/bag/${bagItemId}`);
        },
      });
    }

    return true;
  }

  public getBags() {
    return this.bags;
  }

  public isEmpty() {
    return !this.bags.length;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  public isLoading() {
    return this.loading;
  }

  public dispose() {
    this.disposeLoginReaction();
  }
}

export default Bag;
