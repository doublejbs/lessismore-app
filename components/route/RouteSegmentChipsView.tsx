import { FC } from 'react';
import { StyleSheet, View } from 'react-native';
import CategoryChipView from '@/components/browse/CategoryChipView';
import { AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteListSegment from '@/model/route/RouteListSegment';

interface Props {
  segment: RouteListSegment;
  onChangeSegment: (segment: RouteListSegment) => void;
}

/**
 * 코스 화면(BD-14)·그룹 지도(GRP-10)가 함께 쓰는 `코스 | 포인트` 세그먼트 칩 줄. 목록 섹션 안에도,
 * 바텀 시트 머리(손잡이와 함께 끄는 영역, BD-11)에도 들어간다 — 좌우·위 여백은 놓이는 자리가 정한다.
 */
const RouteSegmentChipsView: FC<Props> = ({ segment, onChangeSegment }) => {
  const l10n = app.getL10n();

  return (
    <View style={styles.segment}>
      <CategoryChipView
        label={l10n.t('route.segmentRoutes')}
        selected={segment === RouteListSegment.Routes}
        onPress={() => onChangeSegment(RouteListSegment.Routes)}
        accessibilityRole='tab'
        accessibilityState={{ selected: segment === RouteListSegment.Routes }}
      />
      <CategoryChipView
        label={l10n.t('route.segmentPoints')}
        selected={segment === RouteListSegment.Points}
        onPress={() => onChangeSegment(RouteListSegment.Points)}
        accessibilityRole='tab'
        accessibilityState={{ selected: segment === RouteListSegment.Points }}
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

export default RouteSegmentChipsView;
