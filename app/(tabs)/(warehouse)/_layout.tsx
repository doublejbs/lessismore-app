import { Stack } from 'expo-router';

// 창고 탭 안 중첩 Stack. 네이티브 헤더는 쓰지 않는다 —
// 탭 루트는 back이 없어 네이티브 바의 이득이 없고, large title 행에 검색 버튼을
// 나란히 두는 배치는 UIKit 표준 바로는 불가능해 커스텀 헤더 행으로 그린다(LG-3).
const WarehouseLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
};

export default WarehouseLayout;
