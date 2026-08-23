import { router } from 'expo-router';
import Firebase from '../firebase/Firebase';
import BagStore from '../store/BagStore';
import AlertManager from '../alert/AlertManager';
import { makeAutoObservable } from 'mobx';
import ToastManager from '../toast/ToastManager';
import app from '../app/App';

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
        throw new Error(app.getL10n().t('bag.memo.loginRequired'));
      }

      await this.bagStore.updateMemo(this.bagId, content.trim());

      app.getAnalyticsManager()?.logClick('memo_confirm');
      router.back();
      this.toastManager.show({ message: app.getL10n().t('bag.memo.saved') });
    } catch (error) {
      console.error('메모 저장 실패:', error); // l10n-ignore
      throw error;
    }
  }

  public delete() {
    this.alertManager.show({
      message: app.getL10n().t('bag.memo.deleteConfirm'),
      confirmText: app.getL10n().t('common.delete'),
      onConfirm: async () => {
        try {
          const userId = this.firebase.getUserId();
          if (!userId) {
            throw new Error(app.getL10n().t('bag.memo.loginRequired'));
          }

          await this.bagStore.updateMemo(this.bagId, '');

          app.getAnalyticsManager()?.logClick('memo_delete');
          router.back();
          this.toastManager.show({ message: app.getL10n().t('bag.memo.deleted') });
        } catch (error) {
          console.error('메모 삭제 실패:', error); // l10n-ignore
          this.alertManager.show({
            message: app.getL10n().t('bag.memo.deleteFailed'),
            confirmText: app.getL10n().t('common.ok'),
            onConfirm: async () => {},
          });
        }
      },
    });
  }
}

export default BagMemo;
