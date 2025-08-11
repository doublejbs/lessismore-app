import { Stack } from 'expo-router';

export default function WarehouseLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '창고',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
