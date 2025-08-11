import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '@/components/Layout';
import AddButtonView from '@/components/warehouse/AddButtonView';

const WarehouseEmptyView: FC = () => {
  return (
    <Layout>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          useless
        </Text>
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.message}>장비를 추가해 주세요</Text>
      </View>
      <AddButtonView />
    </Layout>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'column',
    gap: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  title: {
    fontWeight: '900',
    fontSize: 48,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -4.5,
  },
  messageContainer: {
    width: '100%',
    fontSize: 24,
    fontWeight: 'bold',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingBottom: 53,
  },
  message: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});

export default WarehouseEmptyView;
