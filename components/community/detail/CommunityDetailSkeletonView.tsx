import { StyleSheet, View } from 'react-native';
import { Acg, AcgLayout, AcgRadius } from '@/constants/DesignTokens';

const CommunityDetailSkeletonView = () => {
  return (
    <View style={styles.container}>
      <View style={styles.line} />
      <View style={[styles.line, styles.title]} />
      <View style={styles.block} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: AcgLayout.screenPadding },
  line: { height: 16, width: '35%', backgroundColor: Acg.controlFill, borderRadius: AcgRadius.chip },
  title: { width: '75%', height: 28, marginTop: 20 },
  block: { height: 120, marginTop: 20, backgroundColor: Acg.controlFill, borderRadius: AcgRadius.thumb },
});

export default CommunityDetailSkeletonView;
