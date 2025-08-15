import { Stack } from 'expo-router';

const BagLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='index' />
      <Stack.Screen
        name='edit'
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
};

export default BagLayout;
