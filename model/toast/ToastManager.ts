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

  private constructor() {
    makeAutoObservable(this);
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
      this.setMessage(message);
      this.setButtonText(buttonText);
      this.setOnButtonPress(onButtonPress);
      this.setVisible(true);
      setTimeout(() => {
        this.hide();
      }, 3000);
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

  public hide() {
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

  public getOnButtonPress() {
    return this.onButtonPress;
  }
}

export default ToastManager;
