import CampSiteDetailPageWrapper from '@/components/camp-site/CampSiteDetailPageWrapper';

// 박지 상세 **페이지** 라우트(DST-8) — 시트 라우트(`/camp-site/{id}`)와 같은 화면을
// 일반 푸시로 띄운다. 배낭 상세 > 여행지의 `박지 상세 보기` 전용 진입이다.
const CampSiteDetailPageRoute = () => {
  return <CampSiteDetailPageWrapper />;
};

export default CampSiteDetailPageRoute;
