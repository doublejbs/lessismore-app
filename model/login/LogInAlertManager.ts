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
    this.setLoading(true);
    await this.firebase.logInWithGoogle();
    this.setLoading(false);
    this.hide();
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
