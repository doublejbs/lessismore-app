import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { NoAnimationTab } from '@/components/NoAnimationTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';

export default function TabLayout() {
  const screenOptions: any = {
    tabBarActiveTintColor: 'black',
    headerShown: false,
    tabBarButton: Platform.select({
      ios: HapticTab,
      android: NoAnimationTab,
      default: NoAnimationTab,
    }),
    tabBarStyle: Platform.select({
      ios: {
        // Use a transparent background on iOS to show the blur effect
        position: 'absolute',
      },
      web: {
        height: 65,
        paddingBottom: 8,
      },
      default: {},
    }),
  };

  if (Platform.OS === 'ios') {
    screenOptions.tabBarBackground = TabBarBackground;
  }

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
}
