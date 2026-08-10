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
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
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

interface Props {
  bagActivity: BagActivity;
}

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS 26 투명 헤더는 배경이 없어(고정 레이아웃 화면) 콘텐츠 상단 여백을
// 세이프에어리어 + 컴팩트 바 높이(44pt)로 직접 확보한다.
const IOS_HEADER_BAR_HEIGHT = LiquidLayout.navBar;

// 운동 기록 후보 선택·연결 화면(HA-3).
// 화면당 주 액션은 하나다 — 하단 CTA가 선택 상태에 따라 `연결`/`연결 해제`로 바뀐다.
// 투명 헤더 아래 숨 쉴 여백.
const HEADER_CONTENT_GAP = 12;
// LiquidPillButton과 같은 높이 — 비활성 면이 활성 CTA와 같은 자리를 지켜야 한다.
const PRIMARY_PILL_HEIGHT = LiquidLayout.pillHeight;

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
  const primaryLabel = isUnlinkAction ? '연결 해제' : '연결';

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
          <ActivityIndicator color={Liquid.inkSubtle} />
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
            운동 기록을 불러오지 못했어요
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={LiquidMotion.pressOpacity}
            accessibilityRole='button'
            accessibilityLabel='다시 시도'
          >
            <PretendardText style={styles.retryButtonText} weight='semibold'>
              다시 시도
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
          최근 1년의 운동 기록이에요. 이 여행에 해당하는 것을 모두 선택해
          주세요.
        </PretendardText>
        {bagActivity.getCandidates().map(workout => (
          <BagActivityWorkoutItemView
            key={workout.id}
            workout={workout}
            selected={bagActivity.isSelected(workout.id)}
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
          headerTitle: '운동 기록',
          headerBackButtonDisplayMode: 'minimal',
          ...(phase === BagActivityPhase.Detail
            ? {
                headerRight: () => (
                  <TouchableOpacity
                    style={styles.headerAction}
                    onPress={handleReselect}
                    activeOpacity={LiquidMotion.pressOpacity}
                    accessibilityRole='button'
                    accessibilityLabel='연결할 운동 다시 선택'
                  >
                    <PretendardText
                      style={styles.headerActionText}
                      weight='semibold'
                    >
                      다시 선택
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
            accessibilityLabel='뒤로가기'
          >
            <Ionicons name='chevron-back' size={24} color={Liquid.ink} />
          </TouchableOpacity>
          <PretendardText style={styles.headerTitle} weight='bold'>
            운동 기록
          </PretendardText>
          {/* 상세에서만 후보 목록으로 돌아가는 통로를 둔다 — 상세의 주 목적은 보기다. */}
          {phase === BagActivityPhase.Detail && (
            <TouchableOpacity
              style={styles.headerAction}
              onPress={handleReselect}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='button'
              accessibilityLabel='연결할 운동 다시 선택'
            >
              <PretendardText style={styles.headerActionText} weight='semibold'>
                다시 선택
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
                {summary.count}개 선택
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
          {primaryEnabled ? (
            <LiquidPillButton
              label={primaryLabel}
              variant='primary'
              block
              onPress={handlePressPrimary}
            />
          ) : (
            /* 공용 LiquidPillButton에 비활성 변형이 없어 같은 치수의 로컬 면으로 낮춘다 —
               잉크 면 + 흰 글자는 "누를 수 있다"는 신호라 그대로 두면 안 된다. */
            <View
              style={styles.primaryDisabled}
              accessibilityRole='button'
              accessibilityState={{ disabled: true }}
              accessibilityLabel={primaryLabel}
            >
              <PretendardText
                style={styles.primaryDisabledLabel}
                weight='semibold'
              >
                {primaryLabel}
              </PretendardText>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 부차 화면이라 지형·글로우 없이 평평한 지면만 깐다.
  container: {
    flex: 1,
    backgroundColor: Liquid.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: LiquidLayout.screenH,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: Liquid.ink,
  },
  headerAction: {
    // 헤더 오른쪽 끝으로 밀되 44pt 터치 타깃을 확보한다.
    marginLeft: 'auto',
    minHeight: LiquidLayout.touchMin,
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 15,
    color: Liquid.ink,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    lineHeight: 20,
    color: Liquid.inkSecondary,
  },
  retryButton: {
    minHeight: LiquidLayout.touchMin,
    paddingHorizontal: LiquidLayout.section,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    color: Liquid.ink,
    textDecorationLine: 'underline',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: LiquidLayout.listGap,
    paddingHorizontal: LiquidLayout.screenH,
    paddingBottom: LiquidLayout.section,
  },
  listGuide: {
    fontSize: 13.5,
    lineHeight: 19,
    color: Liquid.inkTertiary,
    marginBottom: 4,
  },
  // 하단 고정 푸터는 콘텐츠를 덮지 않는 flex 형제라 유리(BlurView)를 쓸 이유가 없다 —
  // 종이 면 + 0.5px 헤어라인으로 지면과 가른다.
  footer: {
    gap: 12,
    paddingHorizontal: LiquidLayout.screenH,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 0.5,
    borderTopColor: Liquid.hairline,
    backgroundColor: Liquid.surface,
  },
  summary: {
    gap: 2,
  },
  summaryCount: {
    fontSize: 15,
    lineHeight: 20,
    color: Liquid.ink,
  },
  summaryMetrics: {
    fontSize: 12.5,
    lineHeight: 17,
    color: Liquid.inkTertiary,
  },
  primaryDisabled: {
    height: PRIMARY_PILL_HEIGHT,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // `inkSubtle`은 이 면(surfaceSunken) 위에서 라벨이 거의 읽히지 않는다 — 무엇을 누르게 될지
  // 미리 읽혀야 하는 주 액션이라 AA를 넘기는 `inkTertiary`까지 올린다(`inkMuted`는 3.9로 미달).
  primaryDisabledLabel: {
    fontSize: 16,
    color: Liquid.inkTertiary,
  },
});

export default observer(BagActivityView);
