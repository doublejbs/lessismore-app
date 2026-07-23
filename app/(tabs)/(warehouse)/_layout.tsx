import { Platform } from 'react-native';
import { Stack } from 'expo-router';

const WarehouseLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS === 'ios',
        headerTransparent: Platform.OS === 'ios',
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
};

export default WarehouseLayout;
