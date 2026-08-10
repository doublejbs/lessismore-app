import { FC, useEffect, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Stack, useLocalSearchParams } from 'expo-router';
import LiquidBackdrop from '@/components/liquid/LiquidBackdrop';
import SharedBag from '@/model/shared-bag/SharedBag';
import SharedBagView from './SharedBagView';
import Layout from '../Layout';

// LG-1: iOS만 네이티브 스택 헤더(리퀴드 글래스)를 쓰고, Android/Web은 유리 크롬을 직접 그린다.
const IS_IOS = Platform.OS === 'ios';
// iOS는 네이티브 투명 헤더가 상단을 덮고 스크롤 뷰가 자동 인셋을 받으므로
// top 세이프에어리어를 빼 이중 인셋을 막는다. 하단은 기존 동작 유지.
const IOS_EDGES = ['left', 'right', 'bottom'] as const;

/**
 * 지면은 배낭 상세(BD-1)와 같다 — 지형 0.8 + 짙은 베일 + 좌측 중단 라임 글로우(목업 §6).
 * 같은 배낭을 보는 화면이라 지면부터 같아야 남의 배낭이라는 것 말고는 낯설지 않다.
 */
const SHARED_BAG_BACKDROP = (
  <LiquidBackdrop screen='bagDetail' glowPosition='leftMid' />
);

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
        background={SHARED_BAG_BACKDROP}
      >
        <SharedBagView sharedBag={sharedBag} />
      </Layout>
    );
  }

  // 공유 배낭 데이터를 불러오는 동안에는 **지면만** 둔다 — 스피너를 띄우지 않는다
  // (창고 진입과 같은 처리: 도착 화면이 카드 몇 장이라 짧은 공백이 스피너보다 조용하다).
  return (
    <Layout
      paddingHorizontal={0}
      edges={IS_IOS ? IOS_EDGES : undefined}
      background={SHARED_BAG_BACKDROP}
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
      <View style={styles.loadingWrap} />
    </Layout>
  );
};

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
  },
});

export default observer(SharedBagWrapper);
