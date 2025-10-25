import { initializeApp, FirebaseApp } from 'firebase/app';
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
  getAuth,
  deleteUser,
  reauthenticateWithCredential,
} from 'firebase/auth';
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
  private nickname = '';
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

  private initializeAuth(fireBaseApp: FirebaseApp) {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return initializeAuth(fireBaseApp, {
        persistence: getReactNativePersistence(ReactNativeAsyncStorage),
      });
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
  }

  private async checkLoggedIn() {
    try {
      const userId = this.auth.currentUser;

      if (userId) {
        this.setUserId(userId.uid);
        await this.initializeStore();
        await this.checkTermsAgreement();

        // 네이티브 앱에서만 GoogleSignin 사용
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          await GoogleSignin.signInSilently();
        } else {
          // 웹에서는 Firebase Auth의 토큰 사용
          // await signInWithPopup(this.auth, new GoogleAuthProvider());
        }

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

    // 재인증 수행
    try {
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
      await GoogleSignin.signOut();
    }

    // 로컬 상태 초기화
    this.clear();
  }

  /**
   * Firestore에서 사용자 관련 데이터 삭제
   */
  private async deleteUserData(userId: string) {
    const batch = writeBatch(this.store);

    // users 컬렉션에서 사용자 문서 삭제
    const userDocRef = doc(this.store, 'users', userId);
    batch.delete(userDocRef);

    // bags 컬렉션에서 사용자의 배낭 삭제
    const bagsRef = collection(this.store, 'bags');
    const bagsSnapshot = await getDocs(bagsRef);
    bagsSnapshot.forEach(doc => {
      if (doc.data().userId === userId) {
        batch.delete(doc.ref);
      }
    });

    // gears 컬렉션에서 사용자의 장비 삭제
    const gearsRef = collection(this.store, 'gears');
    const gearsSnapshot = await getDocs(gearsRef);
    gearsSnapshot.forEach(doc => {
      if (doc.data().userId === userId) {
        batch.delete(doc.ref);
      }
    });

    // replies 컬렉션에서 사용자의 댓글 삭제
    const repliesRef = collection(this.store, 'replies');
    const repliesSnapshot = await getDocs(repliesRef);
    repliesSnapshot.forEach(doc => {
      if (doc.data().userId === userId) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
  }
}

export default Firebase;
