import { initializeApp } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signOut,
  User,
  initializeAuth,
  getReactNativePersistence,
  signInWithCredential,
} from 'firebase/auth';
import { makeAutoObservable } from 'mobx';
import { doc, Firestore, getDoc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { FirebaseStorage, getStorage } from 'firebase/storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

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
  private googleProvider = new GoogleAuthProvider();
  private initialized = false;
  private store!: Firestore;
  private storage!: FirebaseStorage;
  private hasAgreedToTerms = false;
  private loggedIn = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    const fireBaseApp = initializeApp(Firebase.config);
    
    // Google Sign-in 설정
    GoogleSignin.configure({
      webClientId: '434364025032-9ocqi7g8s57pu88dmr5lvds5id8a8ent.apps.googleusercontent.com',
      offlineAccess: true,
      hostedDomain: '',
      forceCodeForRefreshToken: true,
      iosClientId: '434364025032-ng7gpn2bks9128u8n2pg5qu47gqhuq43.apps.googleusercontent.com',
    });
    
    this.auth = initializeAuth(fireBaseApp, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });
    this.store = getFirestore(fireBaseApp);
    this.storage = getStorage(fireBaseApp);
    this.setInitialized(true);

    this.auth.onAuthStateChanged(async (user: User | null) => {
      if (user?.uid) {
        await this.checkLoggedIn();
      } else {
        this.setUserId('');
        this.setHasAgreedToTerms(false);
        this.setLoggedIn(false);
      }
    });
  }

  private async checkLoggedIn() {
    const userId = this.auth.currentUser;

    if (userId) {
      this.setUserId(userId.uid);
      await this.initializeStore();
      await this.checkTermsAgreement();
      this.setLoggedIn(true);
    }
  }

  private async checkGoogleSignIn() {
    const user = await GoogleSignin.getCurrentUser();
    const googleCredential = GoogleAuthProvider.credential(user?.idToken);
    await signInWithCredential(this.auth, googleCredential);
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
    this.setHasAgreedToTerms(termsAgreed && privacyAgreed && personalInfoAgreed && over14Agreed);
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
  }

  public getUserId() {
    return this.userId;
  }

  public isLoggedIn() {
    return this.initialized && !!this.userId && this.loggedIn;
  }

  public async logInWithGoogle() {
    try {
      const response = await GoogleSignin.signIn();

      console.log(response);
      
      if (response.data?.idToken) {
        const googleCredential = GoogleAuthProvider.credential(response.data.idToken, response.data.serverAuthCode);
        await signInWithCredential(this.auth, googleCredential);
      } else {
        throw new Error('Google 로그인 실패: idToken을 받을 수 없습니다. Google 설정을 확인해주세요.');
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
}

export default Firebase;
