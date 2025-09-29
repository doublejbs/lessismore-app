import { View, StyleSheet } from 'react-native';

const SeperaterView = () => {
  return <View style={styles.separator} />;
};

const styles = StyleSheet.create({
  separator: {
    width: '100%',
    height: 10,
    backgroundColor: '#F2F4F6',
  },
});

export default SeperaterView;
