import { View, StyleSheet } from 'react-native';
import { Color } from '@/constants/DesignTokens';

const SeperaterView = () => {
  return <View style={styles.separator} />;
};

const styles = StyleSheet.create({
  separator: {
    width: '100%',
    height: 10,
    backgroundColor: Color.divider,
  },
});

export default SeperaterView;
