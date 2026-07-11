import CampSiteType from './CampSiteType';

// 박지 상세(CampSite CS-3/CS-4)에서 쓰는 표시 라벨·문구 매핑.

// wild(노지) 유형에 warnings 유무와 무관하게 항상 노출하는 고정 규제 고지(CS-4).
export const WILD_NOTICE =
  '노지 야영은 지역에 따라 금지될 수 있습니다. 이용 전 반드시 현지 규정을 확인하세요.';

const TYPE_LABEL: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: '야영장',
  [CampSiteType.Shelter]: '대피소',
  [CampSiteType.Wild]: '노지',
};

const SOURCE_LABEL: Record<string, string> = {
  gocamping: '한국관광공사 고캠핑',
  knps: '국립공원공단',
  curated: '자체 큐레이션',
};

export const getCampSiteTypeLabel = (type: CampSiteType): string => {
  return TYPE_LABEL[type] ?? '';
};

export const getCampSiteSourceLabel = (source: string): string => {
  return SOURCE_LABEL[source] ?? source;
};
