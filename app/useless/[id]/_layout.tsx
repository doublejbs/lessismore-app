import { Stack } from 'expo-router';
import { FC } from 'react';

const UselessLayout: FC = () => {
  return (
    <Stack>
      <Stack.Screen name='index' options={{ headerShown: false }} />
    </Stack>
  );
};

export default UselessLayout;
