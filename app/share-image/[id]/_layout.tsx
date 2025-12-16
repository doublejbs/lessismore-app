import { Stack } from 'expo-router';

export default function ShareImageDetailLayout() {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
