import { useState } from 'react';
import BagDestinationPickerView from '@/components/bag-destination/BagDestinationPickerView';
import { takeBagDestinationPicker } from '@/model/bag-destination/BagDestinationPickerHandoff';

// 공용 여행지 선택기(DST-3) — 풀스크린 모달 라우트.
// RN Modal이 아니라 라우트인 이유: 모달이면 그 위로 /camp-site/{id} 같은 라우트 시트를 push해도
// 모달 뒤에 가려져 시트를 자체 구현해야 하고 네이티브 디텐트를 못 쓴다. 라우트면 박지 상세·
// 즐겨찾기 시트가 지도 탭과 완전히 같은 코드 경로로 뜬다.
const BagDestinationPickerRoute = () => {
  // 호출 화면이 실어 둔 파라미터는 마운트 시 1회 소비한다 —
  // 리렌더에 다시 읽히지 않도록 lazy 초기화로 읽는다.
  const [params] = useState(() => takeBagDestinationPicker());

  // 핸드오프 없이 진입할 경로는 없다(딥링크 미노출). 저장할 배낭을 모르면 아무것도 그리지 않는다.
  if (!params) {
    return null;
  }

  return (
    <BagDestinationPickerView
      currentLocation={params.currentLocation}
      onConfirm={params.onConfirm}
      onDone={params.onDone}
    />
  );
};

export default BagDestinationPickerRoute;
