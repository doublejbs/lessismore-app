import { makeAutoObservable } from 'mobx';

class AlertManager {
  public static new() {
    return new AlertManager();
  }

  private visible = false;
  private message = '';
  private confirmText = '';
  private cancelText = '';
  private onConfirm: () => Promise<void> = async () => {};

  private constructor() {
    makeAutoObservable(this);
  }

  public show({
    message,
    confirmText,
    onConfirm,
    cancelText,
  }: {
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
    cancelText?: string;
  }) {
    this.setMessage(message);
    this.setConfirmText(confirmText);
    this.setCancelText(cancelText ?? '');
    this.setOnConfirm(onConfirm);
    this.setVisible(true);
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
    await this.onConfirm();
    this.hide();
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

  private setCancelText(text: string) {
    this.cancelText = text;
  }

  public getCancelText() {
    return this.cancelText;
  }

  private setOnConfirm(onConfirm: () => Promise<void>) {
    this.onConfirm = onConfirm;
  }
}

export default AlertManager;
