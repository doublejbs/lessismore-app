import { router } from 'expo-router';
import Firebase from '../firebase/Firebase';
import BagStore from '../store/BagStore';
import AlertManager from '../alert/AlertManager';
import { makeAutoObservable } from 'mobx';
import ToastManager from '../toast/ToastManager';

class BagMemo {
  public static of(
    bagId: string,
    firebase: Firebase,
    bagStore: BagStore,
    alertManager: AlertManager,
    toastManager: ToastManager
  ) {
    return new BagMemo(bagId, firebase, bagStore, alertManager, toastManager);
  }

  private memo: string = '';

  private constructor(
    private readonly bagId: string,
    private readonly firebase: Firebase,
    private readonly bagStore: BagStore,
    private readonly alertManager: AlertManager,
    private readonly toastManager: ToastManager
  ) {
    makeAutoObservable(this);
  }

  public async initialize() {
    const bagData = await this.bagStore.getBagWithAllFilter(this.bagId);
    this.setMemo(bagData.memo || '');
  }

  private setMemo(value: string) {
    this.memo = value;
  }

  public getMemo() {
    return this.memo;
  }

  public getBagId() {
    return this.bagId;
  }

  public async confirm(content: string) {
    try {
      const userId = this.firebase.getUserId();
      if (!userId) {
        throw new Error('로그인이 필요합니다.');
      }

      await this.bagStore.updateMemo(this.bagId, content.trim());

      router.back();
      this.toastManager.show({ message: '메모가 저장되었습니다.' });
    } catch (error) {
      console.error('메모 저장 실패:', error);
      throw error;
    }
  }

  public delete() {
    this.alertManager.show({
      message: '메모를 삭제하시겠습니까?',
      confirmText: '삭제',
      onConfirm: async () => {
        try {
          const userId = this.firebase.getUserId();
          if (!userId) {
            throw new Error('로그인이 필요합니다.');
          }

          await this.bagStore.updateMemo(this.bagId, '');

          router.back();
          this.toastManager.show({ message: '메모가 삭제되었습니다.' });
        } catch (error) {
          console.error('메모 삭제 실패:', error);
          this.alertManager.show({
            message: '메모 삭제에 실패했습니다.',
            confirmText: '확인',
            onConfirm: async () => {},
          });
        }
      },
    });
  }
}

export default BagMemo;
