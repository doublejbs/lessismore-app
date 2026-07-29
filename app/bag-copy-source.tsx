import BagCopySourceWrapper from '@/components/bag/BagCopySourceWrapper';

// BAG-5: 배낭 추가 → '기존 배낭 복사하기'에서 복사할 원본 배낭을 고르는 네이티브 formSheet 라우트.
// 실측 사실: 이 시트에서 `paddingHorizontal`을 가진 flex 래퍼 View + 자식 ScrollView 구조는 레이아웃이
//   깨졌다(제목이 첫 행에 가림·좌우 여백 소실·하단 행 잘림). detent 조정·`contentStyle: { bottom: 0 }`·
//   `flex: 1`로는 해결되지 않았고, ScrollView를 화면 루트로 올리면 정상 동작한다. 정확한 트리거는
//   미확정이고 CampSiteFavoritesListView는 래핑 구조로도 정상이므로, 구조를 바꾸면 실기기에서 이 시트를
//   반드시 확인할 것. `contentStyle: { bottom: 0 }`이 필요한 이유는 app/_layout.tsx의 camp-site 주석 참고.
// 복사 폼은 push가 아니라 replace로 연다 — formSheet 라우트가 2단으로 쌓인 상태에서 복사 확정 후
//   상세·편집으로 이동하면 내비게이션 옵션 적용이 무한 리렌더에 빠져 흰 화면이 된다
//   (`Maximum update depth exceeded`). bag-add-options가 시트를 교체하는 것과 같은 규칙이다.
const BagCopySourceRoute = () => {
  return <BagCopySourceWrapper />;
};

export default BagCopySourceRoute;
