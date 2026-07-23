import { Platform } from 'react-native';
import { Stack } from 'expo-router';

// 창고 탭 안 중첩 Stack — iOS만 네이티브 헤더(large title + stacked 검색, LG-3).
// Android/Web은 기존 커스텀 로고·검색 토글 행을 유지한다.
const WarehouseLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: Platform.OS === 'ios',
      }}
    />
  );
};

export default WarehouseLayout;
