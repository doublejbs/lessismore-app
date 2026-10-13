import { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgRadius,
  AcgRow,
  AcgType,
  Spacing,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

// 기능 행 썸네일(연회색 면 + 모서리 12)과 그 위 아이콘.
const FEATURE_THUMB_SIZE = 64;
const FEATURE_ICON_SIZE = 28;

type IoniconName = ComponentProps<typeof Ionicons>['name'];

interface Feature {
  key: string;
  icon: IoniconName;
  title: string;
  detail: string;
}

/**
 * SUB-2 ⑥ 기능 설명 4행 — 썸네일 64 + 제목(항목 이름 단) + 설명(메타 줄 단, 두 줄까지 감싼다).
 * HM-8 행 문법: 면 없이 헤어라인으로 가르고 첫 행에는 선을 두지 않는다. 썸네일은 토큰 면 위 아이콘이다
 * (사진·가짜 지도는 쓰지 않는다).
 */
const SubscriptionFeatureListView = () => {
  const l10n = app.getL10n();
  const features: Feature[] = [
    {
      key: 'save',
      icon: 'cloud-download-outline',
      title: l10n.t('subscription.feature1Title'),
      detail: l10n.t('subscription.feature1Detail'),
    },
    {
      key: 'map',
      icon: 'map-outline',
      title: l10n.t('subscription.feature2Title'),
      detail: l10n.t('subscription.feature2Detail'),
    },
    {
      key: 'packing',
      icon: 'checkbox-outline',
      title: l10n.t('subscription.feature3Title'),
      detail: l10n.t('subscription.feature3Detail'),
    },
    {
      key: 'points',
      icon: 'location-outline',
      title: l10n.t('subscription.feature4Title'),
      detail: l10n.t('subscription.feature4Detail'),
    },
  ];

  return (
    <View>
      {features.map((feature, index) => (
        <View
          key={feature.key}
          style={[styles.row, index > 0 && styles.rowDivided]}
          accessible={true}
          accessibilityLabel={`${feature.title}, ${feature.detail}`}
        >
          <View style={styles.thumb}>
            <Ionicons
              name={feature.icon}
              size={FEATURE_ICON_SIZE}
              color={Acg.ink}
            />
          </View>
          <View style={styles.textColumn}>
            <PretendardText weight='medium' style={styles.title}>
              {feature.title}
            </PretendardText>
            <PretendardText style={styles.detail}>
              {feature.detail}
            </PretendardText>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: Spacing.item,
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
  },
  rowDivided: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.hairline,
  },
  thumb: {
    width: FEATURE_THUMB_SIZE,
    height: FEATURE_THUMB_SIZE,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  detail: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default SubscriptionFeatureListView;
