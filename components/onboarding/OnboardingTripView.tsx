import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import OnboardingTrip from '@/model/onboarding/OnboardingTrip';
import OnboardingTripStep from '@/model/onboarding/OnboardingTripStep';
import LogInView from '@/components/login/LogInView';
import OnboardingTripHeaderView from './OnboardingTripHeaderView';
import OnboardingTripFooterView from './OnboardingTripFooterView';
import OnboardingTripDateStepView from './OnboardingTripDateStepView';
import OnboardingTripDestinationStepView from './OnboardingTripDestinationStepView';
import OnboardingTripGearStepView from './OnboardingTripGearStepView';
import OnboardingTripDoneStepView from './OnboardingTripDoneStepView';
import useOnboardingTripState from './useOnboardingTripState';

interface Props {
  trip: OnboardingTrip;
}

interface FooterConfig {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string | undefined;
  onSecondary?: (() => void) | undefined;
}

// 첫 여행 만들기 가이드 화면(OB-3): 머리(뒤로·진행·닫기) / 단계 본문 / 하단 액션.
const OnboardingTripView: FC<Props> = ({ trip }) => {
  const l10n = app.getL10n();
  // fullScreenModal 안에서는 네이티브 SafeAreaView 인셋이 첫 마운트에 0으로 잡힐 수 있어
  // 루트 프로바이더의 훅 값으로 패딩을 준다(DST-3 선택기와 같은 이유).
  const insets = useSafeAreaInsets();
  const {
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
  } = useOnboardingTripState(trip);
  const creating = trip.isCreating();

  const getFooter = (): FooterConfig => {
    switch (step) {
      case OnboardingTripStep.Date:
        return {
          primaryLabel: l10n.t('onboarding.next'),
          onPrimary: handleNext,
          primaryDisabled: !trip.hasDateRange(),
          // 날짜는 필수라 건너뛰기 = 미정이다 — 같은 결과의 버튼을 둘 두지 않는다(OB-4).
          secondaryLabel: l10n.t('onboarding.date.undecided'),
          onSecondary: handleSkip,
        };
      case OnboardingTripStep.Destination:
        return trip.getLocation()
          ? {
              primaryLabel: l10n.t('onboarding.next'),
              onPrimary: handleNext,
              secondaryLabel: l10n.t('onboarding.skip'),
              onSecondary: handleSkip,
            }
          : {
              primaryLabel: l10n.t('onboarding.destination.pick'),
              onPrimary: handleOpenDestinationPicker,
              secondaryLabel: l10n.t('onboarding.skip'),
              onSecondary: handleSkip,
            };
      case OnboardingTripStep.Gear:
        return {
          primaryLabel: l10n.t('onboarding.next'),
          onPrimary: handleNext,
          secondaryLabel: l10n.t('onboarding.skip'),
          onSecondary: handleSkip,
        };
      default:
        // 비로그인 — 로그인하고 이어 만든다(OB-11·OB-12). 권한은 로그인 뒤에 묻는다.
        if (trip.isGuest()) {
          return {
            primaryLabel: l10n.t('onboarding.done.loginAndCreate'),
            onPrimary: handleLogin,
            secondaryLabel: l10n.t('onboarding.done.later'),
            onSecondary: () => {
              void handleLater();
            },
          };
        }

        return trip.canAskPermission()
          ? {
              primaryLabel: l10n.t('onboarding.done.createWithNotification'),
              onPrimary: () => {
                void handleCreate(true);
              },
              secondaryLabel: l10n.t(
                'onboarding.done.createWithoutNotification'
              ),
              onSecondary: () => {
                void handleCreate(false);
              },
            }
          : {
              primaryLabel: l10n.t('onboarding.done.create'),
              // 권한 상태를 읽기 전에는 문구가 바뀔 수 있어 누르지 못하게 둔다.
              primaryDisabled: trip.getPermissionStatus() === null,
              onPrimary: () => {
                void handleCreate(false);
              },
            };
    }
  };

  const renderStep = () => {
    switch (step) {
      case OnboardingTripStep.Date:
        return <OnboardingTripDateStepView trip={trip} />;
      case OnboardingTripStep.Destination:
        return (
          <OnboardingTripDestinationStepView
            trip={trip}
            onOpenPicker={handleOpenDestinationPicker}
          />
        );
      case OnboardingTripStep.Gear:
        return (
          <OnboardingTripGearStepView
            trip={trip}
            onOpenSearch={handleOpenGearSearch}
            onOpenCustomAdd={handleOpenCustomAdd}
          />
        );
      default:
        return <OnboardingTripDoneStepView trip={trip} />;
    }
  };

  const footer = getFooter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingTripHeaderView
        stepIndex={trip.getStepIndex()}
        stepCount={trip.getStepCount()}
        canGoBack={trip.canGoBack()}
        disabled={creating}
        onBack={handleBack}
        onClose={handleClose}
      />
      <View style={styles.body}>{renderStep()}</View>
      <OnboardingTripFooterView
        primaryLabel={footer.primaryLabel}
        onPrimary={footer.onPrimary}
        primaryDisabled={footer.primaryDisabled ?? false}
        loading={creating}
        secondaryLabel={footer.secondaryLabel}
        onSecondary={footer.onSecondary}
      />
      {/* fullScreenModal 위에 떠야 해서 화면이 직접 렌더한다(AU-10 — 검색 모달과 같은 이유). */}
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  body: {
    flex: 1,
  },
});

export default observer(OnboardingTripView);
