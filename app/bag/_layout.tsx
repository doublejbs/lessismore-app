import { Stack } from 'expo-router';

export default function BagLayout() {
  return (
    <Stack>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: '배낭',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}
