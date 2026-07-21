import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
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

// 운동 기록 후보 선택·연결 화면(HA-3).
// 화면당 주 액션은 하나다 — 하단 CTA가 선택 상태에 따라 `연결`/`연결 해제`로 바뀐다.
const BagActivityView: FC<Props> = ({ bagActivity }) => {
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
            운동 기록을 불러오지 못했어요
          </PretendardText>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}
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
      return <BagActivityEmptyView />;
    }

    return (
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <PretendardText style={styles.listGuide}>
          여행 기간에 기록된 운동이에요. 이 여행에 해당하는 것을 모두 선택해
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handlePressBack}
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel='뒤로가기'
        >
          <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
        </TouchableOpacity>
        <PretendardText style={styles.headerTitle} weight='bold'>
          운동 기록
        </PretendardText>
        {/* 상세에서만 후보 목록으로 돌아가는 통로를 둔다 — 상세의 주 목적은 보기다. */}
        {phase === BagActivityPhase.Detail && (
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleReselect}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel='연결할 운동 다시 선택'
          >
            <PretendardText style={styles.headerActionText} weight='semibold'>
              다시 선택
            </PretendardText>
          </TouchableOpacity>
        )}
      </View>
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
            accessibilityLabel={isUnlinkAction ? '연결 해제' : '운동 기록 연결'}
          >
            <PretendardText
              style={[
                styles.primaryButtonText,
                !primaryEnabled && styles.primaryButtonTextDisabled,
              ]}
              weight='semibold'
            >
              {isUnlinkAction ? '연결 해제' : '연결'}
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
    backgroundColor: Color.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    color: Color.textPrimary,
  },
  headerAction: {
    // 헤더 오른쪽 끝으로 밀되 44pt 터치 타깃을 확보한다.
    marginLeft: 'auto',
    minHeight: 44,
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.item,
  },
  errorText: {
    fontSize: 15,
    color: Color.textSecondary,
  },
  retryButton: {
    minHeight: 44,
    paddingHorizontal: Spacing.section,
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 10,
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.section,
  },
  listGuide: {
    fontSize: 13,
    lineHeight: 20,
    color: Color.textSecondary,
    marginBottom: 4,
  },
  footer: {
    gap: Spacing.item,
    paddingHorizontal: Spacing.screenH,
    paddingTop: Spacing.item,
    paddingBottom: Spacing.item,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
    backgroundColor: Color.background,
  },
  summary: {
    gap: 2,
  },
  summaryCount: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  summaryMetrics: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: Radius.card,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: Color.chipInactiveBg,
  },
  primaryButtonText: {
    fontSize: 16,
    color: Color.background,
  },
  // 비활성 배경(밝은 회색) 위에서는 흰 글씨가 읽히지 않아 대비를 확보한 색으로 바꾼다.
  primaryButtonTextDisabled: {
    color: Color.textTertiary,
  },
});

export default observer(BagActivityView);
