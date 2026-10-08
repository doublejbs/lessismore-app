import { makeAutoObservable } from 'mobx';
import Firebase from '../firebase/Firebase';
import { Alert } from 'react-native';
import app from '@/model/app/App';

class LogInAlertManager {
  public static new(firebase: Firebase) {
    return new LogInAlertManager(firebase);
  }

  private visible = false;
  private loading = false;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  public show() {
    this.setVisible(true);
  }

  public hide() {
    this.setVisible(false);
    this.setLoading(false);
  }

  private setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible() {
    return this.visible;
  }

  public async confirm() {
    try {
      this.setLoading(true);
      await this.firebase.logInWithGoogle();
      this.setLoading(false);
      this.hide();
    } catch {
      // 취소(계정 선택 시트 닫기)·실패는 조용히 버튼 상태로 되돌린다(AU-1) — 로딩이 남아 모달이 멈추지 않게.
      this.setLoading(false);
    }
  }

  public async loginWithEmail(email: string, password: string) {
    try {
      this.setLoading(true);
      await this.firebase.login(email, password);
      this.setLoading(false);
      this.hide();
    } catch (error) {
      Alert.alert(
        app.getL10n().t('common.alert'),
        app.getL10n().t('auth.errors.invalidCredentials')
      );
      this.setLoading(false);
    }
  }

  public async loginWithApple() {
    try {
      this.setLoading(true);
      await this.firebase.logInWithApple();
      this.setLoading(false);
      this.hide();
    } catch (error) {
      Alert.alert(
        app.getL10n().t('common.alert'),
        app.getL10n().t('auth.appleLoginFailed')
      );
      this.setLoading(false);
    }
  }

  private setLoading(loading: boolean) {
    this.loading = loading;
  }

  public isLoading() {
    return this.loading;
  }
}

export default LogInAlertManager;
