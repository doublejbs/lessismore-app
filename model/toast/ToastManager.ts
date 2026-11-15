import { makeAutoObservable } from 'mobx';
import { Platform, ToastAndroid } from 'react-native';

const DEFAULT_DURATION_MS = 3000;
const BUTTON_DURATION_MS = 5000;

class ToastManager {
  public static new() {
    return new ToastManager();
  }

  private visible = false;
  private message = '';
  private buttonText?: string | undefined;
  private onButtonPress?: (() => void) | undefined;
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;
  // 떠 있는 토스트가 내려간 뒤 띄울 메시지(`enqueue`). 새 토스트가 앞의 것을 덮지 않게 줄을 세운다.
  private queue: string[] = [];

  private constructor() {
    makeAutoObservable<ToastManager, 'hideTimeoutId' | 'queue'>(this, {
      hideTimeoutId: false,
      queue: false,
    });
  }

  /**
   * 지금 떠 있는 토스트가 내려간 뒤 이어서 띄운다. 떠 있는 것이 없으면 바로 띄운다.
   * Android 네이티브 토스트는 스스로 줄을 세우므로 그대로 넘긴다.
   */
  public enqueue(message: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);

      return;
    }

    if (!this.visible) {
      this.show({ message });

      return;
    }

    this.queue.push(message);
  }

  public show({
    message,
    buttonText,
    onButtonPress,
  }: {
    message: string;
    buttonText?: string;
    onButtonPress?: () => void;
  }) {
    if (Platform.OS === 'android') {
      // Android 네이티브 토스트 사용
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      // 웹이나 다른 플랫폼에서는 커스텀 토스트 사용
      // 떠 있던 토스트의 남은 타이머가 새 토스트를 일찍 내리지 않게 끊는다.
      this.clearHideTimeout();
      this.setMessage(message);
      this.setButtonText(buttonText);
      this.setOnButtonPress(onButtonPress);
      this.setVisible(true);

      // 액션 버튼이 있으면 사용자가 눌러야 하므로 노출 시간을 늘린다(3초 → 5초).
      const duration = buttonText ? BUTTON_DURATION_MS : DEFAULT_DURATION_MS;

      this.hideTimeoutId = setTimeout(() => {
        this.hideTimeoutId = null;
        this.hide();
      }, duration);
    }
  }

  // 토스트의 동작 버튼. 먼저 내리고 콜백을 부른다 — 콜백이 새 토스트를 띄워도 곧바로 지워지지 않게.
  public pressButton() {
    const onButtonPress = this.onButtonPress;

    this.dismiss();
    onButtonPress?.();

    // 콜백이 새 토스트를 띄우지 않았으면 줄 선 것을 잇는다.
    if (!this.visible) {
      this.showNextQueued();
    }
  }

  // Android에서 긴 토스트 표시
  public showLong({ message }: { message: string }) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      this.show({ message });
    }
  }

  // iOS에서 제목 없는 간단한 토스트 (Alert 사용)
  public showSimple(message: string) {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      this.show({ message });
    }
  }

  // 토스트가 내려가면 바로 다음 것을 띄운다 — 줄 선 메시지가 한참 뒤 엉뚱한 화면에서 뜨지 않게.
  private showNextQueued() {
    const next = this.queue.shift();

    if (next === undefined) {
      return;
    }

    this.show({ message: next });
  }

  public hide() {
    this.dismiss();
    this.showNextQueued();
  }

  // 큐를 건드리지 않고 지금 토스트만 내린다.
  private dismiss() {
    this.clearHideTimeout();
    this.setVisible(false);
    this.setButtonText(undefined);
    this.setOnButtonPress(undefined);
  }

  private setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible() {
    return this.visible;
  }

  private setMessage(text: string) {
    this.message = text;
  }

  public getMessage() {
    return this.message;
  }

  private setButtonText(text: string | undefined) {
    this.buttonText = text;
  }

  public getButtonText() {
    return this.buttonText;
  }

  private setOnButtonPress(callback: (() => void) | undefined) {
    this.onButtonPress = callback;
  }

  private clearHideTimeout() {
    if (this.hideTimeoutId !== null) {
      clearTimeout(this.hideTimeoutId);
      this.hideTimeoutId = null;
    }
  }
}

export default ToastManager;
