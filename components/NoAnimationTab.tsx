import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export function NoAnimationTab(props: BottomTabBarButtonProps) {
  // Filter out null values from props
  const cleanProps = Object.fromEntries(
    Object.entries(props).filter(([_, value]) => value !== null)
  ) as any;
  
  return (
    <TouchableOpacity
      {...cleanProps}
      activeOpacity={1}
      onPressIn={(ev) => {
        if (Platform.OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        props.onPressIn?.(ev);
      }}
    />
  );
}
