import { Slot } from 'expo-router';

// 박지 상세는 지도 위 바텀 시트로 뜬다(CS-2). 이 그룹 레이아웃은 Slot이어야 한다 —
// 네이티브 formSheet 안에 중첩 Stack을 두면 내용이 렌더되지 않고 빈 시트가 된다.
// 그래서 상세에서 여는 하위 화면(주간 날씨)도 그룹 안이 아니라 루트의 별도 시트로 띄운다.
const Layout = () => {
  return <Slot />;
};

export default Layout;
