import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// reply 도메인 라우트를 묶는 스택. 작성(input)만 formSheet로 띄우고
// 목록/상세/수정은 기존 push 동작을 유지한다(headerShown:false 상속).
const ReplyLayout = () => {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name='[id]/input/index'
        options={{
          headerShown: false,
          presentation: 'formSheet',
          sheetAllowedDetents:
            Platform.OS === 'android' ? [0.9] : 'fitToContents',
          sheetGrabberVisible: true,
          sheetCornerRadius: 20,
          contentStyle: { backgroundColor: '#FFFFFF' },
        }}
      />
    </Stack>
  );
};

export default ReplyLayout;
