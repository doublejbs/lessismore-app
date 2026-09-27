import { makeAutoObservable } from 'mobx';
import { Platform, ToastAndroid } from 'react-native';

class ToastManager {
  public static new() {
    return new ToastManager();
  }

  private visible = false;
  private message = '';
  private buttonText?: string | undefined;
  private onButtonPress?: (() => void) | undefined;
  private hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

  private constructor() {
    makeAutoObservable<ToastManager, 'hideTimeoutId'>(this, {
      hideTimeoutId: false,
    });
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
      const duration = buttonText ? 5000 : 3000;

      this.hideTimeoutId = setTimeout(() => {
        this.hideTimeoutId = null;
        this.hide();
      }, duration);
    }
  }

  // 토스트의 동작 버튼. 먼저 내리고 콜백을 부른다 — 콜백이 새 토스트를 띄워도 곧바로 지워지지 않게.
  public pressButton() {
    const onButtonPress = this.onButtonPress;

    this.hide();
    onButtonPress?.();
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

  public hide() {
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
