import { FC, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Color } from '@/constants/DesignTokens';
import SharedBag from '@/model/shared-bag/SharedBag';
import SharedBagView from './SharedBagView';
import Layout from '../Layout';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 기존 커스텀 JS 헤더를 유지한다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

const SharedBagWrapper: FC = () => {
  const [sharedBag] = useState(() => SharedBag.new());
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const initialized = sharedBag.isInitialized();

  useEffect(() => {
    void sharedBag.initialize(id);
  }, [id, sharedBag]);

  if (initialized) {
    return (
      <Layout
        paddingHorizontal={0}
        edges={IS_IOS ? IOS_EDGES : undefined}
      >
        <SharedBagView sharedBag={sharedBag} />
      </Layout>
    );
  } else {
    // 공유 배낭 데이터를 불러오는 동안 로딩 인디케이터를 표시한다.
    return (
      <Layout
        paddingHorizontal={0}
        edges={IS_IOS ? IOS_EDGES : undefined}
      >
        {/* LG-1: 로딩 중에도 iOS는 네이티브 헤더(빈 타이틀 + 시스템 back)를 유지해
            데이터 로드 동안 뒤로가기 어포던스가 사라지지 않게 한다. */}
        <Stack.Screen
          options={{
            headerShown: IS_IOS,
            headerTransparent: true,
            headerTitle: '',
            headerBackButtonDisplayMode: 'minimal',
          }}
        />
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
