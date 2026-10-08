import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import OnboardingTripStatus from '@/model/onboarding/OnboardingTripStatus';
import WelcomeAudience from '@/model/onboarding/WelcomeAudience';

/**
 * 첫 실행 환영 화면의 이동·기록·로그인 연계(OB-14·OB-15).
 * 표시 상태와 기록은 `OnboardingTripManager`가 갖고, 여기서는 라우터·하드웨어 뒤로·계측만 다룬다.
 */
const useWelcomeState = () => {
  const router = useRouter();
  const firebase = app.getFirebase();
  // 화면이 뜬 순간의 구분으로 고정한다 — 도중에 로그인해도 버튼 구성이 흔들리지 않는다.
  const [audience] = useState(() =>
    firebase.isLoggedIn() ? WelcomeAudience.Member : WelcomeAudience.Guest
  );
  const isLoggedIn = firebase.isLoggedIn();
  const hasAgreed = firebase.hasUserAgreedToTerms();
  const isLoginVisible = app.getLogInAlertManager()?.isVisible() ?? false;
  // 이 화면의 로그인 링크로 로그인 모달을 열었는지 — 로그인 성공을 이 화면이 처리할지 가른다.
  const hasRequestedLogin = useRef(false);
  const isLeaving = useRef(false);

  useEffect(() => {
    app.getAnalyticsManager()?.logEvent('welcome_view', { audience });
  }, [audience]);

  const close = useCallback(() => {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/(tabs)');
  }, [router]);

  // `다음 백패킹 준비하기` — 이 화면을 가이드로 바꾼다(뒤로 가도 돌아오지 않는다).
  const handleStart = useCallback(() => {
    if (isLeaving.current) {
      return;
    }

    isLeaving.current = true;
    app.getAnalyticsManager()?.logClick('welcome_start');
    app.getOnboardingTripManager()?.startGuideFromWelcome();
    router.replace('/onboarding-trip');
  }, [router]);

  // `먼저 둘러볼게요`·하드웨어 뒤로 — 닫음으로 기록하고 홈으로.
  const handleBrowse = useCallback(async () => {
    if (isLeaving.current) {
      return;
    }

    isLeaving.current = true;
    app.getAnalyticsManager()?.logClick('welcome_browse');
    await app
      .getOnboardingTripManager()
      ?.finish(OnboardingTripStatus.Dismissed);
    close();
  }, [close]);

  // `이미 계정이 있어요 · 로그인`(비로그인만) — 이 화면 위에 기존 로그인 모달을 연다.
  const handleLogin = useCallback(() => {
    app.getAnalyticsManager()?.logClick('welcome_login');
    hasRequestedLogin.current = true;
    app.getLogInAlertManager()?.show();
  }, []);

  // 로그인 성공 — 기기 기록만 남기고 홈으로(같은 세션에 가이드를 다시 띄우지 않는다, OB-15).
  // 약관이 필요한 계정은 레이아웃 가드가 약관 화면으로 바꾸므로 여기서 닫지 않는다.
  // 로그인 모달이 다 내려간 뒤 닫는다 — 모달이 내려가는 중에 화면을 pop하지 않는다.
  useEffect(() => {
    if (!hasRequestedLogin.current || !isLoggedIn || isLoginVisible) {
      return;
    }

    if (isLeaving.current) {
      return;
    }

    isLeaving.current = true;
    void app.getOnboardingTripManager()?.finishWelcomeAfterLogin();

    if (hasAgreed) {
      close();
    }
  }, [isLoggedIn, hasAgreed, isLoginVisible, close]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        void handleBrowse();

        return true;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [handleBrowse]);

  // 예기치 않게 내려가도(약관 리다이렉트·다른 경로의 pop) 팝업 차단이 남지 않게 한다(OB-15).
  useEffect(() => {
    return () => {
      const manager = app.getOnboardingTripManager();

      if (!manager?.isWelcomeShowing()) {
        return;
      }

      if (hasRequestedLogin.current && app.getFirebase().isLoggedIn()) {
        void manager.finishWelcomeAfterLogin();
      } else {
        void manager.finish(OnboardingTripStatus.Dismissed);
      }
    };
  }, []);

  return {
    isGuest: audience === WelcomeAudience.Guest,
    handleStart,
    handleBrowse,
    handleLogin,
  };
};

export default useWelcomeState;
