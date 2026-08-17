import { makeAutoObservable } from 'mobx';
import Firebase from '../firebase/Firebase';
import { Alert } from 'react-native';
import LogInResult from './LogInResult';

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
      const result = await this.firebase.logInWithGoogle();

      if (result === LogInResult.Success) {
        this.hide();
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      Alert.alert('알림', 'Google 로그인에 실패했습니다.');
    } finally {
      this.setLoading(false);
    }
  }

  public async loginWithEmail(email: string, password: string) {
    try {
      this.setLoading(true);
      const result = await this.firebase.login(email, password);

      if (result === LogInResult.Success) {
        this.hide();
      }
    } catch (error) {
      console.error('이메일 로그인 오류:', error);
      Alert.alert('알림', '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      this.setLoading(false);
    }
  }

  public async loginWithApple() {
    try {
      this.setLoading(true);
      const result = await this.firebase.logInWithApple();

      if (result === LogInResult.Success) {
        this.hide();
      }
    } catch (error) {
      console.error('Apple 로그인 오류:', error);
      Alert.alert('알림', 'Apple 로그인에 실패했습니다.');
    } finally {
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
