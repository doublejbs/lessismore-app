import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams } from 'expo-router';
import { Color } from '@/constants/DesignTokens';
import SharedBag from '@/model/shared-bag/SharedBag';
import SharedBagView from './SharedBagView';
import Layout from '../Layout';

const SharedBagWrapper: FC = () => {
  const [sharedBag] = useState(() => SharedBag.new());
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = sharedBag.isInitialized();

  useEffect(() => {
    void sharedBag.initialize(id);
  }, [id, sharedBag]);

  if (initialized) {
    return (
      <Layout paddingHorizontal={0}>
        <SharedBagView sharedBag={sharedBag} />
      </Layout>
    );
  } else {
    // 공유 배낭 데이터를 불러오는 동안 로딩 인디케이터를 표시한다.
    return (
      <Layout paddingHorizontal={0}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Color.textPrimary} />
        </View>
      </Layout>
    );
  }
};

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default observer(SharedBagWrapper);
