import { FC } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgType,
  Color,
  Spacing,
} from '@/constants/DesignTokens';
import BagActivity from '@/model/bag/BagActivity';
import BagActivityPhase from '@/model/bag/BagActivityPhase';
import {
  formatDistance,
  formatDuration,
  formatElevation,
  formatEnergy,
} from '@/model/health/HealthFormat';
import BagActivityDetailView from './BagActivityDetailView';
import BagActivityEmptyView from './BagActivityEmptyView';
import BagActivityIntroView from './BagActivityIntroView';
import BagActivityWorkoutItemView from './BagActivityWorkoutItemView';
import app from '@/model/app/App';

interface Props {
  bagActivity: BagActivity;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을
// 세이프에어리어 + 컴팩트 바 높이(44pt)로 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = 44;

// 운동 기록 후보 선택·연결 화면(HA-3).
// 화면당 주 액션은 하나다 — 하단 CTA가 선택 상태에 따라 `연결`/`연결 해제`로 바뀐다.
// 투명 헤더 아래 숨 쉴 여백.
const HEADER_CONTENT_GAP = 12;

const BagActivityView: FC<Props> = ({ bagActivity }) => {
  const insets = useSafeAreaInsets();
  const phase = bagActivity.getPhase();
  const summary = bagActivity.getSelectedSummary();
  const selectedCount = bagActivity.getSelectedCount();
  const hasLinked = bagActivity.hasLinked();
  const saving = bagActivity.isSaving();

  const handlePressBack = () => {
    bagActivity.back();
  };

  const handleRequestPermission = () => {
    void bagActivity.requestPermission();
  };

  const handleRetry = () => {
    void bagActivity.retry();
  };

  const handleReselect = () => {
    void bagActivity.reselect();
  };

  const handleToggle = (workoutId: string) => {
    bagActivity.toggle(workoutId);
  };

  // 선택을 모두 풀면 연결 해제가 주 액션이 된다 — 별도 파괴 버튼을 두지 않는다.
  const isUnlinkAction = selectedCount === 0 && hasLinked;
  const primaryEnabled = !saving && (selectedCount > 0 || isUnlinkAction);

  const handlePressPrimary = () => {
    if (isUnlinkAction) {
      void bagActivity.unlink();

      return;
    }

    void bagActivity.link();
  };

  const renderBody = () => {
    if (
      phase === BagActivityPhase.Preparing ||
      phase === BagActivityPhase.Loading
    ) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={Color.textSecondary} />
        </View>
      );
    }

    // 이미 연결된 기록이 있으면 후보 선택 대신 상세를 연다(HA-4).
    if (phase === BagActivityPhase.Detail) {
      return <BagActivityDetailView bagActivity={bagActivity} />;
    }

    if (phase === BagActivityPhase.Intro) {
      return (
        <BagActivityIntroView onRequestPermission={handleRequestPermission} />
      );
    }

    if (phase === BagActivityPhase.Error) {
      return (
        <View style={styles.centered}>
          <PretendardText style={styles.errorText}>
            {app.getL10n().t('health.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('common.retry')}
          >
            <PretendardText style={styles.retryButtonText} weight='semibold'>
              {app.getL10n().t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    if (phase === BagActivityPhase.Empty) {
      return (
        <BagActivityEmptyView
          isWorkoutReadConfirmed={bagActivity.isWorkoutReadConfirmed()}
        />
      );
    }

    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <PretendardText style={styles.listGuide}>
          {app.getL10n().t('health.listGuide')}
        </PretendardText>
        {bagActivity.getCandidates().map((workout, index) => (
          <BagActivityWorkoutItemView
            key={workout.id}
            workout={workout}
            selected={bagActivity.isSelected(workout.id)}
            first={index === 0}
            onToggle={handleToggle}
          />
        ))}
      </ScrollView>
    );
  };

  // 설명 화면은 자체 주 액션(권한 요청)을 갖고, 후보가 없으면 연결할 대상도 없다.
  // 단, 이미 연결된 기록이 있으면 후보가 비어도 해제할 수 있어야 한다(HA-3).
  const showFooter =
    phase === BagActivityPhase.Ready ||
    ((phase === BagActivityPhase.Empty || phase === BagActivityPhase.Error) &&
      hasLinked);

  return (
    <View
      style={[
        styles.container,
        // 고정 레이아웃(단계별 본문) 화면 — iOS는 투명 헤더 높이만큼 상단 여백을 직접 확보한다.
        // 헤더 높이만 비우면 콘텐츠가 헤더 바닥에 딱 붙어 카드가 눌린 것처럼 보인다
        // (2026-08-05 사용자 지적) — 한 칸 더 띄운다.
        IS_IOS && {
          paddingTop: insets.top + IOS_HEADER_BAR_HEIGHT + HEADER_CONTENT_GAP,
        },
      ]}
    >
      {/* LG-1: iOS만 네이티브 투명 헤더 — 우측 '다시 선택'은 상세 단계에서만 노출(기존과 동일). */}
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: app.getL10n().t('health.title'),
          headerBackButtonDisplayMode: 'minimal',
          ...(phase === BagActivityPhase.Detail
            ? {
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.headerAction}
                    onPress={handleReselect}
                    activeOpacity={0.7}
                    accessibilityRole='button'
                    accessibilityLabel={app
                      .getL10n()
                      .t('health.reselectAccessibility')}
                  >
                    <PretendardText
                      style={styles.headerActionText}
                      weight='semibold'
                    >
                      {app.getL10n().t('health.reselect')}
                    </PretendardText>
                  </TouchableOpacity>
                ),
              }
            : {}),
        }}
      />
      {!IS_IOS && (
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressBack}
            hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            {app.getL10n().t('health.title')}
          </PretendardText>
          {/* 상세에서만 후보 목록으로 돌아가는 통로를 둔다 — 상세의 주 목적은 보기다. */}
          {phase === BagActivityPhase.Detail && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleReselect}
              activeOpacity={0.7}
              accessibilityRole='button'
              accessibilityLabel={app
                .getL10n()
                .t('health.reselectAccessibility')}
            >
              <PretendardText style={styles.headerActionText} weight='semibold'>
                {app.getL10n().t('health.reselect')}
              </PretendardText>
            </TouchableOpacity>
          )}
        </View>
      )}
      {renderBody()}
      {showFooter && (
        <View style={styles.footer}>
          {summary && (
            <View style={styles.summary}>
              <PretendardText style={styles.summaryCount} weight='semibold'>
                {app.getL10n().t('health.selectedCount', {
                  count: summary.count,
                })}
              </PretendardText>
              <PretendardText style={styles.summaryMetrics}>
                {[
                  formatDistance(summary.distance),
                  formatDuration(summary.duration),
                  summary.elevationGain !== undefined
                    ? formatElevation(summary.elevationGain)
                    : null,
                  summary.activeEnergy !== undefined
                    ? formatEnergy(summary.activeEnergy)
                    : null,
                ]
                  .filter(part => part !== null)
                  .join(' · ')}
              </PretendardText>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              !primaryEnabled && styles.primaryButtonDisabled,
            ]}
            onPress={handlePressPrimary}
            disabled={!primaryEnabled}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityState={{ disabled: !primaryEnabled }}
            accessibilityLabel={app
              .getL10n()
              .t(isUnlinkAction ? 'health.unlinkAction' : 'health.connectAction')}
          >
            <PretendardText
              style={[
                styles.primaryButtonText,
                !primaryEnabled && styles.primaryButtonTextDisabled,
              ]}
              weight='semibold'
            >
              {app
                .getL10n()
                .t(isUnlinkAction ? 'health.unlink' : 'health.connect')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
  },
  headerTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  headerAction: {
    // 헤더 오른쪽 끝으로 밀되 44pt 터치 타깃을 확보한다.
    marginLeft: 'auto',
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.item,
  },
  errorText: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: Acg.controlFill,
  },
  retryButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: Spacing.section,
  },
  listGuide: {
    ...AcgType.body,
    color: Acg.textMuted,
    marginBottom: 4,
  },
  footer: {
    gap: Spacing.item,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: Spacing.item,
    paddingBottom: Spacing.item,
    backgroundColor: 'transparent',
  },
  summary: {
    gap: 2,
  },
  summaryCount: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  summaryMetrics: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Acg.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: Acg.controlFill,
  },
  primaryButtonText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  primaryButtonTextDisabled: {
    color: Acg.textMuted,
  },
});

export default observer(BagActivityView);
