import { initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  initializeAuth,
  getReactNativePersistence,
  signInWithCredential,
  User,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

class Firebase {
  private static readonly config = {
    apiKey: 'AIzaSyBhg7PCSJY7Zm6p804Y5dTad4Qoi8Tr6MU',
    authDomain: 'useless.my',
    projectId: 'lessismore-7e070',
    storageBucket: 'lessismore-7e070.appspot.com',
    messagingSenderId: '434364025032',
    appId: '1:434364025032:web:a8c458d1ee31b0e14dbdfd',
    measurementId: 'G-NC0J0766BX',
  };

  private auth!: Auth;
  private userId = '';
  private initialized = false;
  private store!: Firestore;
  private storage!: FirebaseStorage;
  private hasAgreedToTerms = false;
  private loggedIn = false;
  private idToken: string | null = null;
  private accessToken: string | null = null;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);

    // Google Sign-in 설정
    GoogleSignin.configure({
      webClientId:
        '434364025032-9ocqi7g8s57pu88dmr5lvds5id8a8ent.apps.googleusercontent.com',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: false,
      iosClientId:
        '434364025032-ng7gpn2bks9128u8n2pg5qu47gqhuq43.apps.googleusercontent.com',
    });

    this.auth = initializeAuth(fireBaseApp, {
      persistence:
        Platform.OS === 'ios' || Platform.OS === 'android'
          ? getReactNativePersistence(ReactNativeAsyncStorage)
          : undefined,
    });
    this.store = getFirestore(fireBaseApp);
    this.storage = getStorage(fireBaseApp);

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

  private clear() {
    this.setUserId('');
    this.setHasAgreedToTerms(false);
    this.setIdToken(null);
    this.setAccessToken(null);
    this.setLoggedIn(false);
  }

  private async checkLoggedIn() {
    try {
      const userId = this.auth.currentUser;

      if (userId) {
        this.setUserId(userId.uid);
        await this.initializeStore();
        await this.checkTermsAgreement();
        await GoogleSignin.signInSilently();

        const tokens = await GoogleSignin.getTokens();

        this.setIdToken(tokens.idToken);
        this.setAccessToken(tokens.accessToken);
        this.setLoggedIn(true);
      }
    } catch (error) {
      console.error('checkLoggedIn error', error);
    }
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
    await signInWithEmailAndPassword(this.auth, email, password);
  }

  public async logout() {
    await signOut(this.auth);
    await GoogleSignin.signOut();
  }

  public getUserId() {
    return this.userId;
  }

  public isLoggedIn() {
    return this.loggedIn;
  }

  public async logInWithGoogle() {
    try {
      const response = await GoogleSignin.signIn();

      if (response.data?.idToken) {
        const googleCredential = GoogleAuthProvider.credential(
          response.data.idToken,
          response.data.serverAuthCode
        );
        await signInWithCredential(this.auth, googleCredential);
      } else {
        throw new Error(
          'Google 로그인 실패: idToken을 받을 수 없습니다. Google 설정을 확인해주세요.'
        );
      }
    } catch (error) {
      console.error('Google 로그인 오류:', error);
      throw error;
    }
  }

  public getStore() {
    return this.store;
  }

  private setUserId(value: string) {
    this.userId = value;
  }

  public getStorage() {
    return this.storage;
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
    if (this.accessToken) {
      await GoogleSignin.signInSilently();
      await GoogleSignin.clearCachedAccessToken(this.accessToken);
    }
    const { idToken, accessToken } = await GoogleSignin.getTokens();

    this.idToken = idToken;
    this.accessToken = accessToken;
    return { idToken, accessToken };
  }

  public async getIdTokenResult() {
    if (this.auth.currentUser) {
      return await GoogleSignin.getTokens();
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
}

export default Firebase;
