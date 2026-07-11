import { Platform } from 'react-native';
import CampSiteMapWrapper from '@/components/camp-site/CampSiteMapWrapper';

// 지도 탭(CS-1). 웹은 react-native-maps 미지원이라 탭 자체를 숨기지만,
// 직접 진입 시를 대비해 최소 방어로 아무것도 렌더하지 않는다.
export default function MapTabPage() {
  if (Platform.OS === 'web') {
    return null;
  }

  return <CampSiteMapWrapper />;
}
