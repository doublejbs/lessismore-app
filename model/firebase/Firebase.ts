import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  initializeAuth,
  signInWithCredential,
  User,
  getAuth,
  deleteUser,
  reauthenticateWithCredential,
  OAuthProvider,
} from 'firebase/auth';
// firebase 12.4부터 웹 타입 정의에 RN 전용 export가 누락됨 (firebase-js-sdk#9316).
// 런타임은 Metro가 @firebase/auth의 react-native 번들을 해석해 정상 동작한다.
// eslint-disable-next-line import/no-duplicates
// @ts-ignore
import { getReactNativePersistence } from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  writeBatch,
  query,
  where,
  increment,
} from 'firebase/firestore';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import app from '@/model/app/App';

class Firebase {
  private static readonly config = {
    apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
    authDomain: 'lessismore-7e070.firebaseapp.com',
    projectId: 'lessismore-7e070',
    storageBucket: 'lessismore-7e070.appspot.com',
    messagingSenderId: '434364025032',
    appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
    measurementId: 'G-NC0J0766BX',
  };

  private auth!: Auth;
  private userId = '';
  private nickname = '';
  private initialized = false;
  private store!: Firestore;
  private hasAgreedToTerms = false;
  private loggedIn = false;
  private idToken: string | null = null;
  private accessToken: string | null = null;
  private loginProvider: 'google' | 'apple' | 'email' | null = null;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);

    // 네이티브 앱에서만 Google Sign-in 설정
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      GoogleSignin.configure({
        webClientId:
          '434364025032-9ocqi7g8s57pu88dmr5lvds5id8a8ent.apps.googleusercontent.com',
        offlineAccess: true,
        hostedDomain: '',
        forceCodeForRefreshToken: false,
        iosClientId:
          '434364025032-ng7gpn2bks9128u8n2pg5qu47gqhuq43.apps.googleusercontent.com',
      });
    }

    this.auth = this.initializeAuth(fireBaseApp);
    this.store = getFirestore(fireBaseApp);

    await this.auth.authStateReady();
    await this.checkLoggedIn();
    this.setInitialized(true);
    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (user?.uid) {
        if (user.uid === this.getUserId()) {
          return;
        } else {
          await this.checkLoggedIn();
        }
      } else {
        this.clear();
      }
    });
  }

  private initializeAuth(fireBaseApp: FirebaseApp) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        return initializeAuth(fireBaseApp, {
          persistence: getReactNativePersistence(ReactNativeAsyncStorage),
        });
      } catch {
        // 이미 초기화된 앱(dev 리로드/중복 initialize)이면 기존 인스턴스를 재사용한다.
        return getAuth(fireBaseApp);
      }
    } else {
      return getAuth(fireBaseApp);
    }
  }

  private clear() {
    this.setUserId('');
    this.setHasAgreedToTerms(false);
    this.setIdToken(null);
    this.setAccessToken(null);
    this.setLoggedIn(false);
    this.setLoginProvider(null);
    // 로그아웃 시 내부 태그를 해제한다(기기 재사용 시 속성이 잘못 남지 않게).
    app.getAnalyticsManager()?.identifyUser(null);
    // 다른 사용자로 재로그인 시 이전 사용자의 즐겨찾기가 남지 않도록 초기화한다(CS-9).
    app.getCampFavoriteStore()?.reset();
  }

  private async checkLoggedIn() {
    try {
      const user = this.auth.currentUser;

      if (user) {
        this.setUserId(user.uid);
        // 내부(개발자) 계정이면 analytics에서 제외 태그를 붙인다.
        app.getAnalyticsManager()?.identifyUser(user.uid);
        // 로그인 제공자 확인
        this.detectLoginProvider(user);
        await this.initializeStore();
        await this.checkTermsAgreement();
        this.setLoggedIn(true);
      }
    } catch (error) {
      console.error('checkLoggedIn error', error);
    }
  }

  /**
   * 사용자의 로그인 제공자를 감지
   */
  private detectLoginProvider(user: User) {
    // providerData에서 로그인 제공자 확인
    for (const profile of user.providerData) {
      if (profile.providerId === 'google.com') {
        this.setLoginProvider('google');
        return;
      } else if (profile.providerId === 'apple.com') {
        this.setLoginProvider('apple');
        return;
      } else if (profile.providerId === 'password') {
        this.setLoginProvider('email');
        return;
      }
    }

    // 감지하지 못한 경우 null로 설정
    this.setLoginProvider(null);
  }

  /**
   * 모든 약관 동의 상태를 저장
   */
  public async termsAgreed(
    marketingAgreed: boolean,
    smsAgreed: boolean,
    termsAgreed: boolean,
    privacyAgreed: boolean,
    personalInfoAgreed: boolean,
    over14Agreed: boolean
  ) {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    await updateDoc(userDocRef, {
      termsAgreed: termsAgreed,
      privacyAgreed: privacyAgreed,
      marketingAgreed: marketingAgreed,
      personalInfoAgreed: personalInfoAgreed,
      over14Agreed: over14Agreed,
      smsAgreed: smsAgreed,
      agreedAt: new Date(),
    });
    this.setHasAgreedToTerms(
      termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed
    );
  }

  private async initializeStore() {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return;
    } else {
      await setDoc(userDocRef, {
        termsAgreed: false,
        privacyAgreed: false,
        marketingAgreed: false,
        createdAt: new Date(),
        nickname: `hiker${Math.floor(Math.random() * 10000)}`,
      });
    }
  }

  private async checkTermsAgreement() {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();

      this.setHasAgreedToTerms(
        userData.termsAgreed === true &&
          userData.privacyAgreed === true &&
          userData.personalInfoAgreed === true &&
          userData.over14Agreed === true
      );
      this.setNickname(userData.nickname);
    } else {
      this.setHasAgreedToTerms(false);
    }
  }

  private setInitialized(value: boolean) {
    this.initialized = value;
  }

  public async createUserWithEmailAndPassword(email: string, password: string) {
    await createUserWithEmailAndPassword(this.auth, email, password);
  }

  public async login(email: string, password: string) {
    const result = await signInWithEmailAndPassword(this.auth, email, password);

    if (result.user) {
      this.setLoginProvider('email');
    } else {
      throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
    }
  }

  public async logout() {
    await signOut(this.auth);

    // 네이티브 앱에서만 GoogleSignin 사용
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await GoogleSignin.signOut();
    }
  }

  public getUserId() {
    return this.userId;
  }

  public isLoggedIn() {
    return this.loggedIn;
  }

  public async logInWithGoogle() {
    try {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        // 네이티브 앱에서는 GoogleSignin 라이브러리 사용
        const response = await GoogleSignin.signIn();

        if (response.data?.idToken) {
          const googleCredential = GoogleAuthProvider.credential(
            response.data.idToken,
            response.data.serverAuthCode
          );
          await signInWithCredential(this.auth, googleCredential);
          this.setLoginProvider('google');
        } else {
          throw new Error(
            'Google 로그인 실패: idToken을 받을 수 없습니다. Google 설정을 확인해주세요.'
          );
        }
      } else {
        // 웹에서는 signInWithPopup 사용 (동적 import)
        const firebaseAuth = await import('firebase/auth');
        const signInWithPopup = (firebaseAuth as any).signInWithPopup;
        const provider = new GoogleAuthProvider();
        await signInWithPopup(this.auth, provider);
        this.setLoginProvider('google');
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      throw error;
    }
  }

  public async logInWithApple() {
    try {
      if (Platform.OS === 'ios') {
        // iOS에서는 expo-apple-authentication 사용
        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        const { identityToken } = credential;

        if (identityToken) {
          const provider = new OAuthProvider('apple.com');
          const authCredential = provider.credential({
            idToken: identityToken,
          });
          await signInWithCredential(this.auth, authCredential);
          this.setLoginProvider('apple');
        } else {
          throw new Error(
            'Apple 로그인 실패: identityToken을 받을 수 없습니다.'
          );
        }
      } else if (Platform.OS === 'web') {
        // 웹에서는 signInWithPopup 사용 (동적 import)
        const firebaseAuth = await import('firebase/auth');
        const signInWithPopup = (firebaseAuth as any).signInWithPopup;
        const provider = new OAuthProvider('apple.com');
        provider.addScope('email');
        provider.addScope('name');
        await signInWithPopup(this.auth, provider);
        this.setLoginProvider('apple');
      } else {
        throw new Error('Apple 로그인은 iOS와 웹에서만 지원됩니다.');
      }
    } catch (error: any) {
      if (error.code === 'ERR_REQUEST_CANCELED') {
        // 사용자가 로그인을 취소한 경우
        console.log('Apple 로그인이 취소되었습니다.');
        return;
      }
      console.error('Apple 로그인 오류:', error);
      throw error;
    }
  }

  public getStore() {
    return this.store;
  }

  private setUserId(value: string) {
    this.userId = value;
  }

  public hasUserAgreedToTerms() {
    return this.hasAgreedToTerms;
  }

  private setHasAgreedToTerms(value: boolean) {
    this.hasAgreedToTerms = value;
  }

  private setLoggedIn(value: boolean) {
    this.loggedIn = value;
  }

  public getIdToken(): string | null {
    return this.idToken;
  }

  public getAccessToken() {
    return this.accessToken;
  }

  public async refreshTokens() {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // 네이티브 앱에서는 GoogleSignin 사용
      if (this.accessToken) {
        await GoogleSignin.signInSilently();
        await GoogleSignin.clearCachedAccessToken(this.accessToken);
      }
      const { idToken, accessToken } = await GoogleSignin.getTokens();

      this.idToken = idToken;
      this.accessToken = accessToken;
      return { idToken, accessToken };
    } else {
      // 웹에서는 Firebase Auth의 토큰 사용
      const user = this.auth.currentUser;
      if (user) {
        const idToken = await user.getIdToken(true); // force refresh
        this.idToken = idToken;
        return { idToken, accessToken: null };
      }
      throw new Error('사용자가 로그인되지 않았습니다.');
    }
  }

  public async getIdTokenResult() {
    if (this.auth.currentUser) {
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        return await GoogleSignin.getTokens();
      } else {
        // 웹에서는 Firebase Auth의 토큰 사용
        const idToken = await this.auth.currentUser.getIdToken();
        return { idToken, accessToken: null };
      }
    }
    return null;
  }

  /**
   * 현재 사용자 정보를 가져옵니다.
   */
  public getCurrentUser() {
    return this.auth.currentUser;
  }

  public isInitialized() {
    return this.initialized;
  }

  private setIdToken(value: string | null) {
    this.idToken = value;
  }

  private setAccessToken(value: string | null) {
    this.accessToken = value;
  }

  private setNickname(value: string) {
    this.nickname = value;
  }

  public getNickname() {
    return this.nickname;
  }

  private setLoginProvider(value: 'google' | 'apple' | 'email' | null) {
    this.loginProvider = value;
  }

  public getLoginProvider() {
    return this.loginProvider;
  }

  public async createNickname() {
    if (!!this.getNickname()) {
      return;
    }

    const userDocRef = doc(this.getStore(), 'users', this.getUserId());
    const nickname = `hiker${Math.floor(Math.random() * 10000)}`;

    await updateDoc(userDocRef, {
      nickname: nickname,
    });
    this.setNickname(nickname);
  }

  public async updateNickname(nickname: string) {
    const userDocRef = doc(this.getStore(), 'users', this.getUserId());

    await updateDoc(userDocRef, {
      nickname: nickname,
    });
    this.setNickname(nickname);
  }

  /**
   * 회원 탈퇴 - 사용자 재인증 후 계정 삭제
   */
  public async deleteUserAccount() {
    const user = this.auth.currentUser;

    if (!user) {
      throw new Error('로그인된 사용자가 없습니다.');
    }

    // 재인증 수행 - 로그인 방식에 따라 다르게 처리
    try {
      if (this.loginProvider === 'google') {
        await this.reauthenticateWithGoogle(user);
      } else if (this.loginProvider === 'apple') {
        await this.reauthenticateWithApple(user);
      } else if (this.loginProvider === 'email') {
        throw new Error(
          '이메일로 로그인한 경우, 비밀번호를 다시 입력해야 합니다. deleteUserAccountWithEmail 메서드를 사용하세요.'
        );
      } else {
        throw new Error('로그인 방식을 알 수 없습니다.');
      }
    } catch (error: any) {
      console.error('재인증 실패:', error);
      throw error;
    }

    // Firestore 데이터 삭제
    try {
      await this.deleteUserData(user.uid);
    } catch (error) {
      console.error('사용자 데이터 삭제 실패:', error);
      // 데이터 삭제 실패해도 계정 삭제는 진행
    }

    // Firebase Auth 계정 삭제
    await deleteUser(user);

    // 네이티브 앱에서만 GoogleSignin 로그아웃
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      try {
        await GoogleSignin.signOut();
      } catch (error) {
        // Google 로그인이 아닌 경우 에러 무시
      }
    }

    // 로컬 상태 초기화
    this.clear();
  }

  /**
   * 이메일 로그인 사용자 계정 삭제 (비밀번호 재인증 필요)
   */
  public async deleteUserAccountWithEmail(password: string) {
    const user = this.auth.currentUser;

    if (!user || !user.email) {
      throw new Error('로그인된 사용자가 없습니다.');
    }

    // 이메일/비밀번호로 재인증
    try {
      const firebaseAuth = await import('firebase/auth');
      const EmailAuthProvider = (firebaseAuth as any).EmailAuthProvider;
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    } catch (error: any) {
      console.error('재인증 실패:', error);
      throw new Error('비밀번호가 올바르지 않습니다.');
    }

    // Firestore 데이터 삭제
    try {
      await this.deleteUserData(user.uid);
    } catch (error) {
      console.error('사용자 데이터 삭제 실패:', error);
      // 데이터 삭제 실패해도 계정 삭제는 진행
    }

    // Firebase Auth 계정 삭제
    await deleteUser(user);

    // 로컬 상태 초기화
    this.clear();
  }

  /**
   * Google 재인증
   */
  private async reauthenticateWithGoogle(user: User) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      // 네이티브: Google 재인증
      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        const googleCredential = GoogleAuthProvider.credential(
          response.data.idToken,
          response.data.serverAuthCode
        );
        await reauthenticateWithCredential(user, googleCredential);
      } else {
        throw new Error('재인증에 실패했습니다.');
      }
    } else {
      // 웹: signInWithPopup으로 재인증 (동적 import)
      const firebaseAuth = await import('firebase/auth');
      const signInWithPopup = (firebaseAuth as any).signInWithPopup;
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential) {
        await reauthenticateWithCredential(user, credential);
      } else {
        throw new Error('재인증에 실패했습니다.');
      }
    }
  }

  /**
   * Apple 재인증
   */
  private async reauthenticateWithApple(user: User) {
    if (Platform.OS === 'ios') {
      // iOS에서는 expo-apple-authentication 사용
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      const { identityToken } = credential;

      if (identityToken) {
        const provider = new OAuthProvider('apple.com');
        const authCredential = provider.credential({
          idToken: identityToken,
        });
        await reauthenticateWithCredential(user, authCredential);
      } else {
        throw new Error('Apple 재인증 실패: identityToken을 받을 수 없습니다.');
      }
    } else if (Platform.OS === 'web') {
      // 웹에서는 signInWithPopup 사용 (동적 import)
      const firebaseAuth = await import('firebase/auth');
      const signInWithPopup = (firebaseAuth as any).signInWithPopup;
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      const result = await signInWithPopup(this.auth, provider);
      const credential = OAuthProvider.credentialFromResult(result);
      if (credential) {
        await reauthenticateWithCredential(user, credential);
      } else {
        throw new Error('재인증에 실패했습니다.');
      }
    } else {
      throw new Error('Apple 재인증은 iOS와 웹에서만 지원됩니다.');
    }
  }

  /**
   * Firestore에서 사용자 관련 데이터 삭제
   */
  private async deleteUserData(userId: string) {
    const store = this.store;
    const operations: ((batch: ReturnType<typeof writeBatch>) => void)[] = [];

    // 사용자 장비 서브컬렉션 조회 (gear-rank 감소 + 서브컬렉션 삭제에 모두 사용)
    const gearsSnapshot = await getDocs(
      collection(store, 'users', userId, 'gears')
    );

    // 카탈로그 장비(isCustom === false)의 gear-rank count 감소, count ≤ 1이면 삭제
    for (const gearDoc of gearsSnapshot.docs) {
      if (gearDoc.data().isCustom === false) {
        const gearRankRef = doc(store, 'gear-rank', gearDoc.id);
        const gearRankDoc = await getDoc(gearRankRef);

        if (gearRankDoc.exists()) {
          const currentCount = gearRankDoc.data().count || 0;

          if (currentCount <= 1) {
            operations.push(batch => batch.delete(gearRankRef));
          } else {
            operations.push(batch =>
              batch.update(gearRankRef, {
                count: increment(-1),
                updatedAt: new Date(),
              })
            );
          }
        }
      }
    }

    // users/{uid}.bags에 기록된 bag 문서 삭제
    const userDocRef = doc(store, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const bagIds: string[] = userDoc.exists()
      ? userDoc.data().bags ?? []
      : [];

    for (const bagId of bagIds) {
      operations.push(batch => batch.delete(doc(store, 'bag', bagId)));
    }

    // users/{uid}/gears 서브컬렉션 전체 문서 삭제
    for (const gearDoc of gearsSnapshot.docs) {
      operations.push(batch => batch.delete(gearDoc.ref));
    }

    // comment-likes에서 userId == uid인 문서 삭제
    const likesSnapshot = await getDocs(
      query(collection(store, 'comment-likes'), where('userId', '==', userId))
    );

    for (const likeDoc of likesSnapshot.docs) {
      operations.push(batch => batch.delete(likeDoc.ref));
    }

    // users/{uid} 문서 삭제
    operations.push(batch => batch.delete(userDocRef));

    // 500 한도 미만(400)으로 청크 분할하여 커밋
    const CHUNK_SIZE = 400;

    for (let i = 0; i < operations.length; i += CHUNK_SIZE) {
      const batch = writeBatch(store);

      for (const operation of operations.slice(i, i + CHUNK_SIZE)) {
        operation(batch);
      }

      await batch.commit();
    }
  }
}

export default Firebase;
