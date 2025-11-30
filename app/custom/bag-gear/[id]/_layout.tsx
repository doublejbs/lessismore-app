import { Stack } from 'expo-router';

export default function CustomBagGearLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    />
  );
}
