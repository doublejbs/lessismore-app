import { FC, useState } from 'react';
import BagDetail from '@/model/bag-detail/BagDetail';
import { observer } from 'mobx-react-lite';
import BagDetailView from '@/components/bag-detail/BagDetailView';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

const BagDetailWrapper: FC = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [bagDetail] = useState(() => BagDetail.from(router, id ?? ''));

  return (
    <SafeAreaView style={styles.container}>
      <BagDetailView bagDetail={bagDetail} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
});

export default observer(BagDetailWrapper);
