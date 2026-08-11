import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import CampSiteMapWrapper from '@/components/camp-site/CampSiteMapWrapper';

// 지도 탭(CS-1). 웹은 네이티브 지도 SDK 미지원이라 탭 자체를 숨기지만,
// 직접 진입 시를 대비해 최소 방어로 아무것도 렌더하지 않는다.
const MapTabPage = () => {
  if (Platform.OS === 'web') {
    return null;
  }

  return (
    <>
      {/**
       * **이 탭만** 탭바를 투명으로 떨어뜨리지 않는다(CS-2).
       *
       * 지도 화면에는 스크롤 뷰가 없어 iOS가 탭바에 scroll-edge 외형(투명)을 적용하는데,
       * 그러면 도심 밀집 타일에서 지도 선·라벨이 탭 아이콘 아래로 지나가 실루엣이 깨진다
       * (2026-08-11 디자인 리뷰). 트리거에 준 값이 `NativeTabs`의 값보다 우선하므로
       * 공용 탭바(`app/(tabs)/_layout.tsx`)는 건드리지 않고 이 화면에서만 유리 재질을 유지한다.
       * 화면에서 쓰는 트리거는 넘긴 값만 옵션으로 올려 보내므로 아이콘·라벨은 그대로다.
       */}
      {Platform.OS === 'ios' ? (
        <NativeTabs.Trigger disableTransparentOnScrollEdge />
      ) : null}
      <CampSiteMapWrapper />
    </>
  );
};

export default MapTabPage;
