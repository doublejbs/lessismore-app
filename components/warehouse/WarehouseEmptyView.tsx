import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import Layout from '@/components/Layout';
import AddButtonView from '@/components/warehouse/AddButtonView';
import Warehouse from '@/model/warehouse/Warehouse';
import LoadingIconView from '../ui/LoadingIconView';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';

interface Props {
  warehouse: Warehouse;
}

const WarehouseEmptyView: FC<Props> = ({ warehouse }) => {
  const isLoading = warehouse.isLoading();

  return (
    <Layout paddingHorizontal={AcgLayout.screenH}>
      <View style={styles.headerContainer}>
        <PretendardText weight='extraBold' style={styles.title}>
          useless
        </PretendardText>
      </View>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <LoadingIconView />
        </View>
      ) : (
        <View style={styles.messageContainer}>
          <PretendardText weight='bold' style={styles.message}>
            장비를 추가해 주세요
          </PretendardText>
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
    fontSize: 48,
    textAlign: 'center',
    lineHeight: 48,
    letterSpacing: -4.5,
    color: Acg.ink,
  },
  messageContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingBottom: 53,
  },
  message: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default observer(WarehouseEmptyView);
