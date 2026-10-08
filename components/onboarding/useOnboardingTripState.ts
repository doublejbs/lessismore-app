import { useCallback, useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import app from '@/model/app/App';
import GearFilter from '@/model/gear/GearFilter';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import Gear from '@/model/gear/Gear';
import { setGearPick } from '@/model/gear/GearPickHandoff';
import OnboardingTrip, {
  OnboardingTripCreateResult,
} from '@/model/onboarding/OnboardingTrip';
import OnboardingTripAction from '@/model/onboarding/OnboardingTripAction';
import OnboardingTripGearSource from '@/model/onboarding/OnboardingTripGearSource';
import OnboardingTripStatus from '@/model/onboarding/OnboardingTripStatus';
import OnboardingTripStep from '@/model/onboarding/OnboardingTripStep';

/**
 * 첫 여행 가이드 화면의 이동·이탈·생성 핸들러(OB-3~OB-7).
 * 단계 상태와 입력은 도메인(`OnboardingTrip`)이 갖고, 여기서는 라우터·알럿·하드웨어 뒤로만 다룬다.
 */
const useOnboardingTripState = (trip: OnboardingTrip) => {
  const router = useRouter();
  const step = trip.getStep();

  const closeGuide = useCallback(async () => {
    await trip.dismiss();
    router.back();
  }, [trip, router]);

  // 닫기 ×(OB-3) — 고른 게 없으면 바로, 있으면 확인 후 닫는다.
  const handleClose = useCallback(() => {
    if (trip.isCreating()) {
      return;
    }

    if (!trip.hasProgress()) {
      void closeGuide();

      return;
    }

    const l10n = app.getL10n();

    Alert.alert(
      l10n.t('onboarding.closeConfirm.title'),
      l10n.t('onboarding.closeConfirm.message'),
      [
        { text: l10n.t('onboarding.closeConfirm.continue'), style: 'cancel' },
        {
          text: l10n.t('onboarding.closeConfirm.close'),
          style: 'destructive',
          onPress: () => {
            void closeGuide();
          },
        },
      ]
    );
  }, [trip, closeGuide]);

  const handleBack = useCallback(() => {
    trip.goBack();
  }, [trip]);

  // 안드로이드 하드웨어 뒤로 — 2~4단계는 이전 단계, 1단계는 닫기(OB-3). 생성 중에는 무시한다.
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (trip.isCreating()) {
          return true;
        }

        if (trip.canGoBack()) {
          trip.goBack();
        } else {
          handleClose();
        }

        return true;
      }
    );

    return () => {
      subscription.remove();
    };
  }, [trip, handleClose]);

  // 예기치 않게 화면이 내려가도(다른 경로의 pop 등) 팝업 차단이 남지 않게 닫음으로 기록한다(APP-10).
  // 로그인 이어가기 중이면(약관 리다이렉트 등) 기록 없이 초안을 남긴다 — 탭에 돌아오면 다시 연다(OB-12).
  useEffect(() => {
    return () => {
      const manager = app.getOnboardingTripManager();

      if (!manager?.isShowing()) {
        return;
      }

      if (trip.isAwaitingLogin()) {
        manager.suspend();
      } else {
        void manager.finish(OnboardingTripStatus.Dismissed);
      }
    };
  }, [trip]);

  const handleCreateResult = useCallback(
    async (run: () => Promise<OnboardingTripCreateResult | null>) => {
      const l10n = app.getL10n();

      try {
        const result = await run();

        if (!result) {
          return;
        }

        router.replace(`/bag/${result.bagId}`);

        if (result.partialFailure) {
          Alert.alert(
            l10n.t('onboarding.done.partialFailedTitle'),
            l10n.t('onboarding.done.partialFailed')
          );
        }
      } catch (error) {
        console.error('첫 여행 가이드 여행 생성 실패:', error); // l10n-ignore: 개발자 로그
        Alert.alert(
          l10n.t('onboarding.done.createFailedTitle'),
          l10n.t('onboarding.done.createFailed')
        );
      }
    },
    [router]
  );

  // 로그인하고 여행 만들기(OB-12) — 모달 닫힘(취소 판정)·로그인 성공·약관 완료를 지켜본다.
  // observer 컴포넌트의 렌더에서 읽으므로 값이 바뀌면 다시 렌더되고 effect가 돈다.
  const firebase = app.getFirebase();
  const isLoggedIn = firebase.isLoggedIn();
  const hasAgreed = firebase.hasUserAgreedToTerms();
  const isLoginVisible = app.getLogInAlertManager()?.isVisible() ?? false;
  const awaitingLogin = trip.isAwaitingLogin();
  const wasLoginVisible = useRef(false);

  useEffect(() => {
    if (wasLoginVisible.current && !isLoginVisible) {
      void trip.handleLoginClosed();
    }

    wasLoginVisible.current = isLoginVisible;
  }, [trip, isLoginVisible]);

  useEffect(() => {
    if (isLoggedIn) {
      trip.handleLoggedIn();
    }
  }, [trip, isLoggedIn, awaitingLogin]);

  useEffect(() => {
    if (!trip.shouldAutoCreate()) {
      return;
    }

    void handleCreateResult(() => trip.autoCreate());
  }, [trip, isLoggedIn, hasAgreed, awaitingLogin, handleCreateResult]);

  // 3단계는 진입·포커스 복귀(검색·직접 추가 닫힘)마다 창고를 다시 읽는다(OB-6).
  // 인기 장비는 첫 진입에 한 번만 읽는다(도메인이 캐시).
  useFocusEffect(
    useCallback(() => {
      if (step === OnboardingTripStep.Gear) {
        void trip.loadGears();
        void trip.loadPopularGears();
      }
    }, [trip, step])
  );

  useEffect(() => {
    if (step === OnboardingTripStep.Done) {
      void trip.loadPermissionStatus();
    }
  }, [trip, step]);

  const handleNext = useCallback(() => {
    trip.advance(OnboardingTripAction.Next);
  }, [trip]);

  const handleSkip = useCallback(() => {
    trip.advance(OnboardingTripAction.Skip);
  }, [trip]);

  // 공용 여행지 선택기(DST-3) — 여행이 아직 없으므로 고른 값은 가이드 상태에만 담는다(OB-5).
  const handleOpenDestinationPicker = useCallback(() => {
    setBagDestinationPicker({
      currentLocation: trip.getLocation(),
      onConfirm: async (location: BagLocation) => {
        trip.setLocation(location);
      },
    });
    router.push('/bag-destination-picker');
  }, [trip, router]);

  // `다른 {카테고리} 찾기`(OB-6) — 창고 컨텍스트 검색 모달을 그 카테고리 필터로 연다.
  // 비로그인은 담기 모드(OB-13) — 창고에 쓰지 않고 고른 장비를 가이드로 돌려받는다.
  const handleOpenGearSearch = useCallback(
    (group: GearFilter) => {
      if (trip.isGuest()) {
        setGearPick({
          onPick: (gear: Gear) => {
            trip.pickGear(gear);
          },
          isPicked: (gear: Gear) => trip.isGearSelected(gear),
        });
        router.push(`/search?category=${group}&pick=onboarding`);

        return;
      }

      trip.markPickSource(OnboardingTripGearSource.Search);
      router.push(`/search?category=${group}`);
    },
    [trip, router]
  );

  // `직접 추가`(OB-6) — SR-11과 같은 수동 폼 라우트를 그 카테고리로 연다. 저장은 즉시 창고에 들어가고
  // 돌아오면 자동 선택된다. 검색 결과 없음 계측(click_search_empty_custom_add)은 보내지 않는다.
  const handleOpenCustomAdd = useCallback(
    (group: GearFilter) => {
      trip.markPickSource(OnboardingTripGearSource.Custom);
      router.push({ pathname: '/custom', params: { category: group } });
    },
    [trip, router]
  );

  const handleCreate = useCallback(
    async (askPermission: boolean) => {
      await handleCreateResult(() => trip.create(askPermission));
    },
    [trip, handleCreateResult]
  );

  // 비로그인 완료 단계(OB-11) — 로그인하고 여행 만들기 / 나중에 할게요.
  const handleLogin = useCallback(() => {
    void trip.requestLogin();
  }, [trip]);

  const handleLater = useCallback(async () => {
    await trip.later();
    router.back();
  }, [trip, router]);

  return {
    step,
    handleClose,
    handleBack,
    handleNext,
    handleSkip,
    handleOpenDestinationPicker,
    handleOpenGearSearch,
    handleOpenCustomAdd,
    handleCreate,
    handleLogin,
    handleLater,
  };
};

export default useOnboardingTripState;
