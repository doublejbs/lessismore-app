import { makeAutoObservable } from 'mobx';

class AlertManager {
  public static new() {
    return new AlertManager();
  }

  private visible = false;
  private message = '';
  private confirmText = '';
  private cancelText = '';
  // 되돌릴 수 없는 액션(내보내기·삭제)일 때 확인 버튼을 경고색으로 그린다.
  private destructive = false;
  private onConfirm: () => Promise<void> = async () => {};

  private constructor() {
    makeAutoObservable(this);
  }

  public show({
    message,
    confirmText,
    onConfirm,
    cancelText,
    destructive,
  }: {
    message: string;
    confirmText: string;
    onConfirm: () => Promise<void>;
    cancelText?: string;
    destructive?: boolean;
  }) {
    this.setMessage(message);
    this.setConfirmText(confirmText);
    this.setCancelText(cancelText ?? '');
    this.setDestructive(destructive === true);
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

  private setDestructive(value: boolean) {
    this.destructive = value;
  }

  public isDestructive() {
    return this.destructive;
  }

  private setOnConfirm(onConfirm: () => Promise<void>) {
    this.onConfirm = onConfirm;
  }
}

export default AlertManager;
