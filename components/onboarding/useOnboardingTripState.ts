import { useCallback, useEffect } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import app from '@/model/app/App';
import GearFilter from '@/model/gear/GearFilter';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { setBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripAction from '@/model/onboarding/OnboardingTripAction';
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
  useEffect(() => {
    return () => {
      const manager = app.getOnboardingTripManager();

      if (manager?.isShowing()) {
        void manager.finish(OnboardingTripStatus.Dismissed);
      }
    };
  }, []);

  // 3단계는 진입·포커스 복귀(검색 모달 닫힘)마다 창고를 다시 읽는다(OB-6).
  useFocusEffect(
    useCallback(() => {
      if (step === OnboardingTripStep.Gear) {
        void trip.loadGears();
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

  // 필수 장비 검색(OB-6) — 창고 컨텍스트 검색 모달을 그 카테고리 필터로 연다.
  const handleOpenGearSearch = useCallback(
    (group: GearFilter) => {
      router.push(`/search?category=${group}`);
    },
    [router]
  );

  const handleCreate = useCallback(
    async (askPermission: boolean) => {
      const l10n = app.getL10n();

      try {
        const result = await trip.create(askPermission);

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
    [trip, router]
  );

  return {
    step,
    handleClose,
    handleBack,
    handleNext,
    handleSkip,
    handleOpenDestinationPicker,
    handleOpenGearSearch,
    handleCreate,
  };
};

export default useOnboardingTripState;
