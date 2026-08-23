import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Spacing } from '@/constants/DesignTokens';
import BagActivity from '@/model/bag/BagActivity';
import BagActivityDetailStatus from '@/model/bag/BagActivityDetailStatus';
import BagActivityRouteMapView from './BagActivityRouteMapView';
import BagActivitySummaryView from './BagActivitySummaryView';
import BagActivityWorkoutDetailView from './BagActivityWorkoutDetailView';

interface Props {
  bagActivity: BagActivity;
}

// 연결된 운동 기록의 상세(HA-4). 요약 → 경로 지도 → 운동별 추이 순으로 쌓는다.
//
// 요약은 Firestore 스냅샷(DM-22)이라 항상 그릴 수 있고, 지도·그래프는 기기에서
// 다시 읽은 값이라 없을 수 있다(HA-5). 없다고 화면을 막지 않는다.
const BagActivityDetailView: FC<Props> = ({ bagActivity }) => {
  const summary = bagActivity.getLinkedSummary();
  const status = bagActivity.getDetailStatus();
  const details = bagActivity.getDetails();
  const routes = bagActivity.getRoutes();
  const saving = bagActivity.isSaving();

  const handleRetry = () => {
    void bagActivity.retryDetail();
  };

  const handleUnlink = () => {
    void bagActivity.unlink();
  };

  if (!summary) {
    return null;
  }

  const renderDetailSection = () => {
    if (status === BagActivityDetailStatus.Loading) {
      return (
        <View style={styles.detailPlaceholder}>
          <ActivityIndicator color={Color.textSecondary} />
        </View>
      );
    }

    if (status === BagActivityDetailStatus.Unavailable) {
      return (
        <View style={styles.detailPlaceholder}>
          <PretendardText style={styles.noticeText}>
            {app.getL10n().t('health.detailUnavailable')}
          </PretendardText>
          <TouchableOpacity
            style={styles.textButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={app.getL10n().t('health.detailRetry')}
          >
            <PretendardText style={styles.textButtonLabel} weight='semibold'>
              {app.getL10n().t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* 경로가 없으면 지도만 빼고 넘어간다. 예전에는 이유를 문장으로 알렸는데,
            서드파티 동기화 기록에는 경로가 거의 없어 대부분의 사용자에게 늘 뜨는
            안내가 됐다 — 고칠 수 없는 사실을 매번 알리는 셈이었다(2026-08-05 사용자 결정). */}
        {routes.length > 0 ? <BagActivityRouteMapView routes={routes} /> : null}
        {details.map(detail => (
          <BagActivityWorkoutDetailView
            key={detail.workout.id}
            detail={detail}
            isOnly={details.length === 1}
          />
        ))}
      </>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <BagActivitySummaryView
        summary={summary}
        weightGrams={bagActivity.getWeightGrams()}
        {...(details.length === 1
          ? { singleWorkout: details[0].workout }
          : {})}
      />
      {renderDetailSection()}
      {/* 파괴적 액션이라 화면 맨 아래에 텍스트 버튼으로 둔다 — 주 액션과 경쟁하지 않게. */}
      <TouchableOpacity
        style={styles.textButton}
        onPress={handleUnlink}
        disabled={saving}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityState={{ disabled: saving }}
        accessibilityLabel={app.getL10n().t('health.unlinkAction')}
      >
        <PretendardText style={styles.unlinkLabel} weight='semibold'>
          {app.getL10n().t('health.unlink')}
        </PretendardText>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.section,
    paddingHorizontal: Spacing.screenH,
    paddingBottom: Spacing.section,
  },
  detailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.item,
    paddingVertical: Spacing.section,
  },
  noticeText: {
    ...AcgType.body,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  // 화면의 다른 요소가 전부 좌측 정렬인데 이 버튼만 가운데라 축이 어긋났다
  // (2026-08-05 디자인 리뷰). 좌측으로 붙이고 좌우 패딩은 뺀다.
  textButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  textButtonLabel: {
    ...AcgType.control,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
  // 연결 해제는 되돌리기 쉬운(다시 연결하면 되는) 동작이라 경고색 대신 보조 톤을 쓴다.
  unlinkLabel: {
    ...AcgType.control,
    color: Color.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default observer(BagActivityDetailView);
