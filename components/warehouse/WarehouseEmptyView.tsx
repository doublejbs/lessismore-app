import { FC } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Layout from '@/components/Layout';
import AddButtonView from '@/components/warehouse/AddButtonView';
import Warehouse from '@/model/warehouse/Warehouse';
import LoadingIconView from '../ui/LoadingIconView';
import { observer } from 'mobx-react-lite';

interface Props {
  warehouse: Warehouse;
}

const WarehouseEmptyView: FC<Props> = ({ warehouse }) => {
  const isLoading = warehouse.isLoading();

  return (
    <Layout>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>useless</Text>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingIconView />
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <Text style={styles.message}>장비를 추가해 주세요</Text>
        </View>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(WarehouseEmptyView);
