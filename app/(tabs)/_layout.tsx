import { Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { NoAnimationTab } from '@/components/NoAnimationTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import AcgGlassView from '@/components/acg/AcgGlassView';
import { Acg } from '@/constants/DesignTokens';

// iOS는 네이티브 UITabBar(NativeTabs)로 iOS 26 리퀴드 글래스를 받고,
// Android/Web은 기존 커스텀 JS 탭바(react-navigation)를 그대로 쓴다.
//
// 첫 탭은 창고가 아니라 **홈**이다(HM-0 A안, 2026-07-31). iPhone 탭바는 다섯 개가
// 실질 상한이라 홈을 넣으려면 하나를 빼야 했고, 창고는 목적이 분명할 때 가는 화면이라
// 한 뎁스 내려가도 손해가 작다고 보았다. 창고는 `/warehouse` 푸시 라우트로 남으며
// 홈의 창고 미리보기 카드(HM-4)가 그 입구다.
const NativeTabLayout = () => {
  return (
    <NativeTabs
      tintColor='#000000'
      iconColor={{ default: '#8E8E93', selected: '#000000' }}
      labelStyle={{
        default: { color: '#8E8E93' },
        selected: { color: '#000000' },
      }}
      minimizeBehavior='onScrollDown'
    >
      <NativeTabs.Trigger name='index'>
        <NativeTabs.Trigger.Icon sf='house.fill' drawable='ic_menu_home' />
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='search'>
        <NativeTabs.Trigger.Icon
          sf='magnifyingglass'
          drawable='ic_menu_search'
        />
        <NativeTabs.Trigger.Label>탐색</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='map'>
        <NativeTabs.Trigger.Icon sf='map.fill' drawable='ic_menu_mapmode' />
        <NativeTabs.Trigger.Label>지도</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='bag'>
        <NativeTabs.Trigger.Icon
          sf='figure.hiking'
          drawable='ic_menu_compass'
        />
        <NativeTabs.Trigger.Label>배낭</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='info'>
        <NativeTabs.Trigger.Icon sf='person.fill' drawable='ic_menu_myplaces' />
        <NativeTabs.Trigger.Label>정보</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

// Android·Web 탭바(JS). iOS는 `NativeTabs`가 시스템 리퀴드 글래스를 그리므로 여기 오지 않는다.
// 이 두 플랫폼은 `BlurView` 비용 대비 결과가 약해 반투명 채움 + 상단 헤어라인으로만 맞춘다
// (`AcgGlassView`가 플랫폼별로 알아서 폴백한다).
const JsTabLayout = () => {
  const screenOptions: any = {
    tabBarActiveTintColor: 'black',
    headerShown: false,
    tabBarButton: NoAnimationTab,
    // 채움을 유리 레이어에 넘기려면 바 자체는 투명이어야 한다. 높이·패딩은 그대로 둔다.
    tabBarStyle: [
      styles.tabBar,
      Platform.select({
        web: {
          height: 65,
          paddingBottom: 8,
        },
        default: {},
      }),
    ],
    tabBarBackground: () => (
      <AcgGlassView elevated={false} style={styles.tabBarGlass} />
    ),
  };

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name='index'
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name='house.fill' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='search'
        options={{
          title: '탐색',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={24} name='magnifyingglass' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='map'
        options={{
          title: '지도',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name='map.fill' color={color} />
          ),
          // 웹은 네이티브 지도 SDK 미지원이라 탭바에서 숨긴다(CS 플랫폼 분기).
          ...(Platform.OS === 'web' ? { href: null } : {}),
        }}
      />
      <Tabs.Screen
        name='bag'
        options={{
          title: '배낭',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name='figure.hiking' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='info'
        options={{
          title: '정보',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name='person.fill' color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    // 채움이 투명해진 만큼 기본 테두리·그림자를 걷어내고, 경계는 유리 레이어가 낸다.
    borderTopWidth: 0,
    elevation: 0,
  },
  // 탭바의 스펙큘러는 위쪽 엣지 하나다. 밝은 바 위에서 흰 광택은 읽히지 않아
  // 어두운 헤어라인(line2)을 쓴다 — 콘텐츠와 탭바를 가르는 선이 사라지면 안 된다.
  tabBarGlass: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Acg.line2,
  },
});

export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return <NativeTabLayout />;
  }

  return <JsTabLayout />;
}
