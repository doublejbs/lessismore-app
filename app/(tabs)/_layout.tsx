import React from 'react';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayout() {
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
}
