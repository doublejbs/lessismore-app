import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgRadius, AcgType, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';

// 카드 안쪽 여백.
const CARD_PADDING = 16;
// 단계 아이콘 크기와 그 열의 폭(세로 선이 이 열 가운데로 지난다).
const STEP_ICON_SIZE = 22;
const STEP_RAIL_WIDTH = 28;
// 단계 사이 세로 선 굵기와, 선이 아이콘에서 띄우는 간격.
const STEP_LINE_WIDTH = 2;
const STEP_LINE_GAP = 4;
// 단계 사이 간격(선이 이 높이를 잇는다).
const STEP_GAP = 16;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface TrialStep {
  key: string;
  icon: IoniconName;
  label: string;
}

interface Props {
  // 체험 뒤 청구될 스토어 가격. 모르면 null(가격 없는 문구).
  priceString: string | null;
}

/**
 * SUB-2 ⑤ 체험 카드 — `체험은 이렇게 진행돼요` + 세 단계 타임라인(아이콘 + 세로 선).
 * 연회색 면 + 모서리 12, 그림자 없음(HM-8). 5일째 단계가 SUB-10 체험 종료 로컬 알림이다.
 */
const SubscriptionTrialTimelineView = ({ priceString }: Props) => {
  const l10n = app.getL10n();
  const steps: TrialStep[] = [
    {
      key: 'today',
      icon: 'lock-open-outline',
      label: l10n.t('subscription.trialToday'),
    },
    {
      key: 'day5',
      icon: 'notifications-outline',
      label: l10n.t('subscription.trialDay5'),
    },
    {
      key: 'day7',
      icon: 'checkmark-circle-outline',
      label: priceString
        ? l10n.t('subscription.trialDay7', { price: priceString })
        : l10n.t('subscription.trialDay7NoPrice'),
    },
  ];

  return (
    <View style={styles.card}>
      <PretendardText weight='semibold' style={styles.title}>
        {l10n.t('subscription.trialCardTitle')}
      </PretendardText>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;

          return (
            <View key={step.key} style={styles.step}>
              <View style={styles.rail}>
                <Ionicons
                  name={step.icon}
                  size={STEP_ICON_SIZE}
                  color={Acg.ink}
                />
                {isLast ? null : <View style={styles.line} />}
              </View>
              <PretendardText
                style={[styles.label, !isLast && styles.labelSpaced]}
              >
                {step.label}
              </PretendardText>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: CARD_PADDING,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  steps: {
    marginTop: Spacing.item,
  },
  step: {
    flexDirection: 'row',
    columnGap: Spacing.item,
  },
  rail: {
    width: STEP_RAIL_WIDTH,
    alignItems: 'center',
  },
  // 다음 단계 아이콘까지 잇는 선 — 연회색 면 위에서 보이는 잉크 틴트(헤어라인은 면과 같은 회색이라 안 보인다).
  line: {
    flex: 1,
    width: STEP_LINE_WIDTH,
    marginVertical: STEP_LINE_GAP,
    borderRadius: STEP_LINE_WIDTH / 2,
    backgroundColor: Acg.line2,
  },
  label: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flex: 1,
    // 아이콘(22)과 한 줄(20)의 가운데를 맞춘다.
    paddingTop: (STEP_ICON_SIZE - AcgType.rowSubtitle.lineHeight) / 2,
  },
  labelSpaced: {
    paddingBottom: STEP_GAP,
  },
});

export default SubscriptionTrialTimelineView;
