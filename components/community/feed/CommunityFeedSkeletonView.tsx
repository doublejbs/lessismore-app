import { StyleSheet, View } from 'react-native';
import { Acg, AcgRadius } from '@/constants/DesignTokens';

const CARD_PADDING = 16;
// 스켈레톤 셰이딩은 디자인 토큰 예외다.
const SKELETON_SHADE = '#E8E8E8';

const CommunityFeedSkeletonView = () => {
  return (
    <View style={styles.card}>
      <View style={styles.meta} />
      <View style={styles.title} />
      <View style={styles.body} />
      <View style={styles.bodyShort} />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    minHeight: 160,
    gap: 10,
    padding: CARD_PADDING,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
  },
  meta: {
    width: '60%',
    height: 14,
    backgroundColor: SKELETON_SHADE,
  },
  title: {
    width: '82%',
    height: 20,
    backgroundColor: SKELETON_SHADE,
  },
  body: {
    width: '94%',
    height: 14,
    backgroundColor: SKELETON_SHADE,
  },
  bodyShort: {
    width: '70%',
    height: 14,
    backgroundColor: SKELETON_SHADE,
  },
});

export default CommunityFeedSkeletonView;
