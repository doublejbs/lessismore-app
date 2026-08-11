import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { NoAnimationTab } from '@/components/NoAnimationTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Liquid } from '@/constants/DesignTokens';

// iOS는 네이티브 UITabBar(NativeTabs)로 iOS 26 리퀴드 글래스를 받고,
// Android/Web은 기존 커스텀 JS 탭바(react-navigation)를 그대로 쓴다.
//
// 첫 탭은 창고가 아니라 **홈**이다(HM-0 A안, 2026-07-31). iPhone 탭바는 다섯 개가
// 실질 상한이라 홈을 넣으려면 하나를 빼야 했고, 창고는 목적이 분명할 때 가는 화면이라
// 한 뎁스 내려가도 손해가 작다고 보았다. 창고는 `/warehouse` 푸시 라우트로 남으며
// 홈의 창고 미리보기 카드(HM-4)가 그 입구다.
const NativeTabLayout = () => {
  return (
    // 탭바 아이콘은 SF Symbols를 유지하되(핸드오프 웹→RN 변환 규칙) 색은 잉크 스케일에서
    // 가져온다 — 순수 검정과 iOS 시스템 회색은 이 팔레트에 없는 값이다.
    //
    // **활성은 `limeInk`다**(2026-08-11 디자인 리뷰). 잉크(#101012)와 비활성 회색(#8A8A94)은
    // 명도만 다른 같은 계열이라, 유리 캡슐 안에서는 어느 탭이 켜졌는지 한눈에 갈리지 않았다 —
    // 색상까지 다른 라임 계열로 올려 캡슐 말고도 신호를 하나 더 준다. 목업의 `잉크 캡슐 + 라임
    // 아이콘`(`Liquid.tabActiveBg`·`tabActiveIcon`)은 직접 그리는 웹 탭바의 값이고, 네이티브
    // UITabBar는 캡슐을 시스템이 그려 채움색을 지정할 수 없다. 밝은 유리 면 위 라임 계열
    // 글자·아이콘은 `limeInk`가 정본이다(라임 원색은 글자색으로 쓰지 않는다).
    <NativeTabs
      tintColor={Liquid.limeInk}
      iconColor={{ default: Liquid.tabInactive, selected: Liquid.limeInk }}
      labelStyle={{
        default: { color: Liquid.tabInactive },
        selected: { color: Liquid.limeInk },
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
      {/* 이 탭이 여는 것은 배낭 목록이라 아이콘도 배낭이어야 한다 — `figure.hiking`(걷는
          사람)은 활동을 말해 배낭·창고·여행지 어디로든 읽혔다(2026-08-11 디자인 리뷰).
          `backpack.fill`은 SF Symbols 2022(iOS 16.0)라 이 앱의 최소 버전(16.4)에서 안전하다. */}
      <NativeTabs.Trigger name='bag'>
        <NativeTabs.Trigger.Icon sf='backpack.fill' drawable='ic_menu_agenda' />
        <NativeTabs.Trigger.Label>배낭</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      {/* 앱은 사용자를 '나'로 부른다(`내 창고`·`내 기록`) — 이 탭도 `내 정보`이고,
          도착 화면의 제목 블록과 같은 말이다(AU-4). */}
      <NativeTabs.Trigger name='info'>
        <NativeTabs.Trigger.Icon sf='person.fill' drawable='ic_menu_myplaces' />
        <NativeTabs.Trigger.Label>내 정보</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

const JsTabLayout = () => {
  const screenOptions: any = {
    // 활성 색은 iOS 네이티브 탭바와 같은 `limeInk`다(위 주석).
    tabBarActiveTintColor: Liquid.limeInk,
    tabBarInactiveTintColor: Liquid.tabInactive,
    headerShown: false,
    tabBarButton: NoAnimationTab,
    tabBarStyle: Platform.select({
      web: {
        height: 65,
        paddingBottom: 8,
      },
      default: {},
    }),
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
            <IconSymbol size={28} name='backpack.fill' color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name='info'
        options={{
          title: '내 정보',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name='person.fill' color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return <NativeTabLayout />;
  }

  return <JsTabLayout />;
}
