import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagRouteSegment from '@/model/bag-route/BagRouteSegment';

interface Props {
  segment: BagRouteSegment;
  onChangeSegment: (segment: BagRouteSegment) => void;
}

/**
 * 배낭 코스 화면의 `코스 | 포인트` 세그먼트 칩 줄 (BD-14). 목록 섹션 안에도, 바텀 시트 머리(손잡이와 함께
 * 끄는 영역, BD-11)에도 들어간다 — 좌우·위 여백은 놓이는 자리가 정한다.
 */
const BagRouteSegmentChipsView: FC<Props> = ({ segment, onChangeSegment }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.segment}>
      <CategoryChipView
        label={l10n.t('bag.point.segmentRoutes')}
        selected={segment === BagRouteSegment.Routes}
        onPress={() => onChangeSegment(BagRouteSegment.Routes)}
        accessibilityRole='tab'
        accessibilityState={{ selected: segment === BagRouteSegment.Routes }}
      />
      <CategoryChipView
        label={l10n.t('bag.point.segmentPoints')}
        selected={segment === BagRouteSegment.Points}
        onPress={() => onChangeSegment(BagRouteSegment.Points)}
        accessibilityRole='tab'
        accessibilityState={{ selected: segment === BagRouteSegment.Points }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
});

export default BagRouteSegmentChipsView;
