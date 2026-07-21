import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Spacing } from '@/constants/DesignTokens';
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
            이 기기에서 상세를 불러오지 못했어요. 건강 앱 접근이 꺼져 있거나
            다른 기기에서 연결한 기록일 수 있어요.
          </PretendardText>
          <TouchableOpacity
            style={styles.textButton}
            onPress={handleRetry}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel='상세 다시 불러오기'
          >
            <PretendardText style={styles.textButtonLabel} weight='semibold'>
              다시 시도
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        {/* 경로가 하나도 없으면(실내 운동·경로 권한 없음) 지도 영역 자체를 렌더하지 않는다.
            웹은 건강 허브가 미지원이라 경로가 늘 비어 네이티브 지도가 마운트되지 않는다. */}
        {routes.length > 0 && <BagActivityRouteMapView routes={routes} />}
        {details.map(detail => (
          <BagActivityWorkoutDetailView
            key={detail.workout.id}
            detail={detail}
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
        accessibilityLabel='운동 기록 연결 해제'
      >
        <PretendardText style={styles.unlinkLabel} weight='semibold'>
          연결 해제
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
    fontSize: 14,
    lineHeight: 21,
    color: Color.textSecondary,
    textAlign: 'center',
  },
  textButton: {
    minHeight: 44,
    alignSelf: 'center',
    paddingHorizontal: Spacing.section,
    justifyContent: 'center',
  },
  textButtonLabel: {
    fontSize: 15,
    color: Color.textPrimary,
    textDecorationLine: 'underline',
  },
  // 연결 해제는 되돌리기 쉬운(다시 연결하면 되는) 동작이라 경고색 대신 보조 톤을 쓴다.
  unlinkLabel: {
    fontSize: 15,
    color: Color.textSecondary,
    textDecorationLine: 'underline',
  },
});

export default observer(BagActivityDetailView);
