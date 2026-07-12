import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Color } from '@/constants/DesignTokens';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteDetailDispatcher from '@/model/camp-site/CampSiteDetailDispatcher';
import CampSiteDetailView from './CampSiteDetailView';
import Layout from '../Layout';

const CampSiteDetailWrapper: FC = () => {
  const router = useRouter();
  const [campSiteDetail] = useState(() =>
    CampSiteDetail.new(router, CampSiteDetailDispatcher.new())
  );
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = campSiteDetail.isInitialized();

  useEffect(() => {
    campSiteDetail.initialize(id);
  }, [id, campSiteDetail]);

  if (initialized) {
    return (
      <Layout paddingHorizontal={0}>
        <CampSiteDetailView campSiteDetail={campSiteDetail} />
      </Layout>
    );
  } else {
    // 박지 데이터를 불러오는 동안 빈 화면 대신 로딩 인디케이터를 표시한다(CS-3).
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

export default observer(CampSiteDetailWrapper);
