import { makeAutoObservable } from 'mobx';
import Firebase from '../firebase/Firebase';
import { Alert } from 'react-native';

/**
 * 로그인 제공자. `Firebase.getLoginProvider()`가 돌려주는 집합과 같다.
 *
 * 컨벤션대로면 string enum이어야 하지만, `Firebase`가 이 값을 문자열 리터럴로 읽고 쓰는
 * 자리(재인증 분기·애널리틱스 파라미터)가 여럿이라 여기만 enum으로 바꾸면 비교마다 캐스팅이
 * 붙는다. enum 전환은 인증 경로를 함께 손볼 때 한다.
 */
type LoginProvider = 'google' | 'apple' | 'email';

class LogInAlertManager {
  public static new(firebase: Firebase) {
    return new LogInAlertManager(firebase);
  }

  private visible = false;
  /**
   * **어느 제공자로 요청이 오가는 중인가**(AU-1). 제공자를 구분하지 않는 boolean 하나면
   * Apple을 눌러도 진행 표시가 Google 버튼에 붙어, 누르지 않은 쪽이 진행 중인 것처럼 읽힌다.
   * `null`이면 진행 중인 요청이 없다.
   */
  private loadingProvider: LoginProvider | null = null;

  private constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  public show() {
    this.setVisible(true);
  }

  public hide() {
    this.setVisible(false);
    this.setLoadingProvider(null);
  }

  private setVisible(visible: boolean) {
    this.visible = visible;
  }

  public isVisible() {
    return this.visible;
  }

  /**
   * Google 로그인. 실패는 예전처럼 그대로 던진다(취소는 조용히 무시하는 정책) — 다만
   * 진행 표시는 `finally`에서 반드시 풀어야 한다. 그러지 않으면 팝업을 닫은 뒤에도
   * 버튼이 영구히 비활성으로 남는다.
   */
  public async confirm() {
    try {
      this.setLoadingProvider('google');
      await this.firebase.logInWithGoogle();
      this.hide();
    } finally {
      this.setLoadingProvider(null);
    }
  }

  public async loginWithEmail(email: string, password: string) {
    try {
      this.setLoadingProvider('email');
      await this.firebase.login(email, password);
      this.hide();
    } catch {
      Alert.alert('알림', '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      this.setLoadingProvider(null);
    }
  }

  public async loginWithApple() {
    try {
      this.setLoadingProvider('apple');
      await this.firebase.logInWithApple();
      this.hide();
    } catch {
      Alert.alert('알림', 'Apple 로그인에 실패했습니다.');
    } finally {
      this.setLoadingProvider(null);
    }
  }

  private setLoadingProvider(provider: LoginProvider | null) {
    this.loadingProvider = provider;
  }

  /** 진행 표시를 붙일 버튼을 고르는 값 — 나머지 버튼은 `isLoading()`으로 비활성만 한다. */
  public getLoadingProvider() {
    return this.loadingProvider;
  }

  public isLoading() {
    return this.loadingProvider !== null;
  }
}

export default LogInAlertManager;
