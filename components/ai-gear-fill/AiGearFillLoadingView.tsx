import { FC, useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { SKELETON_SHADE } from '@/constants/DesignTokens';
import { Acg, AcgLayout, AcgRow, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

const SKELETON_ROWS = 6;
const BADGE_SIZE = 28;
const PULSE_MS = 750;
const ROW_KEYS = Array.from({ length: SKELETON_ROWS }, (_, index) => index);

// 로딩(AS-8): 상태 한 줄 + 결과 행 모양(제목·메타·이유 세 줄 + 우측 원) 스켈레톤 6개.
// 셰이딩은 검색 스켈레톤(SR-4)과 같은 값·같은 맥박이다. 보통 5~15초.
const AiGearFillLoadingView: FC = () => {
  const status = app.getL10n().t('aiGearFill.loading');
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5,
          duration: PULSE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: PULSE_MS,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacity]);

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole='progressbar'
      accessibilityLabel={status}
    >
      <PretendardText style={styles.status}>{status}</PretendardText>
      {ROW_KEYS.map(key => (
        <View key={key} style={[styles.row, key > 0 && styles.divided]}>
          <View style={styles.text}>
            <Animated.View style={[styles.bar, styles.titleBar, { opacity }]} />
            <Animated.View style={[styles.bar, styles.metaBar, { opacity }]} />
            <Animated.View
              style={[styles.bar, styles.reasonBar, { opacity }]}
            />
          </View>
          <Animated.View style={[styles.badge, { opacity }]} />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: 8,
  },
  status: {
    ...AcgType.body,
    color: Acg.textMuted,
    marginBottom: 4,
  },
  // 결과 행(AiGearFillRowView)과 같은 높이·간격·헤어라인.
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: AcgRow.paddingVertical,
    minHeight: AcgRow.minHeight,
  },
  divided: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  text: {
    flex: 1,
    gap: 8,
  },
  bar: {
    height: 14,
    borderRadius: 2,
    backgroundColor: SKELETON_SHADE,
  },
  titleBar: {
    width: '55%',
  },
  metaBar: {
    width: '40%',
  },
  reasonBar: {
    width: '70%',
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: SKELETON_SHADE,
  },
});

export default AiGearFillLoadingView;
