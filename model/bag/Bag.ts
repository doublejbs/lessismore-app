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
import Order from '@/model/order/Order';
import { createBagOrderOptions } from '@/model/order/BagOrderOptions';
import { getBagComparator } from '@/model/order/BagOrderComparators';
import { router } from 'expo-router';

class Bag {
  // 배낭 목록 정렬 저장 키(BAG-6). 창고(warehouse)·배낭 편집(bag)과 선택값을 공유하지 않는다.
  private static readonly ORDER_KEY = 'bagList';

  public static new() {
    return new Bag(
      app.getBagStore()!,
      app.getFirebase(),
      app.getAlertManager()!,
      app.getToastManager()!,
      Order.new(Bag.ORDER_KEY, createBagOrderOptions())
    );
  }

  private bags: BagItem[] = [];
  /**
   * 첫 조회 전에는 **로딩으로 시작한다**(BAG-1). false로 시작하면 목록이 오기 전 한 프레임 동안
   * 빈 상태 문구가 번쩍인다 — 배낭이 있는 사용자에게도 "배낭이 없어요"가 잠깐 보였다.
   * 비로그인은 조회하지 않으므로 아래 `getList`가 곧바로 끈다.
   */
  private loading = true;
  // 저장된 정렬 복원(order.initialize())을 1회만 수행하기 위한 가드.
  // 목록 조회는 재포커스마다 반복되지만 AsyncStorage 복원은 첫 조회 때 한 번이면 된다(BAG-6).
  private initialized = false;
  private disposeLoginReaction: () => void;

  private constructor(
    private readonly bagStore: BagStore,
    private readonly firebase: Firebase,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager,
    private readonly order: Order
  ) {
    makeAutoObservable(this);
    this.disposeLoginReaction = reaction(
      () => this.firebase.isLoggedIn(),
      async () => {
        await this.getList();
      }
    );
  }

  public getOrder() {
    return this.order;
  }

  public async getList() {
    if (this.firebase.isLoggedIn()) {
      // 이미 목록이 있으면(재포커스 등) 로딩뷰 없이 조용히 갱신 — 깜빡임 방지.
      // 첫 진입에서는 아래 await보다 먼저 켜야 빈 상태 문구(§6)가 잠깐 보이지 않는다.
      if (this.bags.length === 0) {
        this.setLoading(true);
      }

      if (!this.initialized) {
        await this.order.initialize();
        this.setInitialized(true);
      }

      this.setBags(await this.bagStore.getList());
      this.setLoading(false);
    } else {
      this.setBags([]);
      // 비로그인은 조회할 것이 없으므로 초기 로딩을 바로 끈다(위 loading 주석 참고).
      this.setLoading(false);
    }
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
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
      failureMessage: '삭제하지 못했어요. 다시 시도해주세요.',
      onConfirm: async () => {
        app.getAnalyticsManager()?.logClick('bag_delete');
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

  // 정렬은 100% 클라이언트 정렬이라 정렬을 바꿔도 새로 받아올 데이터가 없다 —
  // 재조회 없이 이미 받아 둔 배열을 표시 시점에 정렬한다(BAG-6).
  // getSelectedOrderType()이 observable이라 정렬을 바꾸면 observer가 자동으로 다시 렌더한다.
  public getBags() {
    return [...this.bags].sort(
      getBagComparator(this.order.getSelectedOrderType())
    );
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
