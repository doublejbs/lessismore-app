import { makeAutoObservable } from 'mobx';
import ToastManager from '@/model/toast/ToastManager';

const DEFAULT_FAILURE_MESSAGE = '요청을 처리하지 못했어요. 다시 시도해주세요.';

class AlertManager {
  public static new(toastManager: ToastManager) {
    return new AlertManager(toastManager);
  }

  private visible = false;
  private message = '';
  private confirmText = '';
  private cancelable = true;
  private confirming = false;
  private onConfirm: () => Promise<void> = async () => {};

  private constructor(private readonly toastManager: ToastManager) {
    makeAutoObservable(this);
  }

  public show({
    message,
    confirmText,
    onConfirm,
    failureMessage,
    cancelable = true,
  }: {
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
    failureMessage?: string;
    cancelable?: boolean;
  }) {
    this.setMessage(message);
    this.setConfirmText(confirmText);
    this.setOnConfirm(onConfirm);
    this.setFailureMessage(failureMessage);
    this.setCancelable(cancelable);
    this.setVisible(true);
  }

  public notify({
    message,
    confirmText,
  }: {
    message: string;
    confirmText: string;
  }) {
    this.show({
      message,
      confirmText,
      cancelable: false,
      onConfirm: async () => {},
    });
  }

  public hide() {
    this.setVisible(false);
  }

  private setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible() {
    return this.visible;
  }

  public async confirm() {
    if (this.confirming) {
      return;
    }

    this.setConfirming(true);

    try {
      await this.onConfirm();
    } catch (error) {
      console.error('알럿 확인 콜백 실패:', error);

      try {
        this.toastManager.show({
          message: this.failureMessage || DEFAULT_FAILURE_MESSAGE,
        });
      } catch (toastError) {
        console.error('알럿 실패 토스트 표시 실패:', toastError);
      }
    } finally {
      this.setConfirming(false);
      this.hide();
    }
  }

  private setMessage(text: string) {
    this.message = text;
  }

  private setConfirmText(text: string) {
    this.confirmText = text;
  }

  public getMessage() {
    return this.message;
  }

  public getConfirmText() {
    return this.confirmText;
  }

  public isCancelable() {
    return this.cancelable;
  }

  public isConfirming() {
    return this.confirming;
  }

  private failureMessage = '';

  private setFailureMessage(text: string | undefined) {
    this.failureMessage = text || '';
  }

  private setCancelable(cancelable: boolean) {
    this.cancelable = cancelable;
  }

  private setConfirming(confirming: boolean) {
    this.confirming = confirming;
  }

  private setOnConfirm(onConfirm: () => Promise<void>) {
    this.onConfirm = onConfirm;
  }
}

export default AlertManager;
