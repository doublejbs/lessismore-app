import { Ionicons } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';

const Layout = () => {
  return (
    <Stack>
      <Stack.Screen
        name='index'
        options={{
          headerShown: true,
          headerTitle: '수정하기',
          headerTintColor: 'black',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name='chevron-back' size={24} color='black' />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
};

export default Layout;
