import React from 'react';
import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';
import { NoAnimationTab } from '@/components/NoAnimationTab';
import { IconSymbol } from '@/components/ui/IconSymbol';

// iOS는 네이티브 UITabBar(NativeTabs)로 iOS 26 리퀴드 글래스를 받고,
// Android/Web은 기존 커스텀 JS 탭바(react-navigation)를 그대로 쓴다.
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
        <Icon sf='house.fill' drawable='ic_menu_home' />
        <Label>창고</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='search'>
        <Icon sf='magnifyingglass' drawable='ic_menu_search' />
        <Label>탐색</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='map'>
        <Icon sf='map.fill' drawable='ic_menu_mapmode' />
        <Label>지도</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='bag'>
        <Icon sf='figure.hiking' drawable='ic_menu_compass' />
        <Label>배낭</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name='info'>
        <Icon sf='person.fill' drawable='ic_menu_myplaces' />
        <Label>정보</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
};

const JsTabLayout = () => {
  const screenOptions: any = {
    tabBarActiveTintColor: 'black',
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
          title: '창고',
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
          // 웹은 react-native-maps 미지원이라 탭바에서 숨긴다(CS 플랫폼 분기).
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

export default function TabLayout() {
  if (Platform.OS === 'ios') {
    return <NativeTabLayout />;
  }

  return <JsTabLayout />;
}
