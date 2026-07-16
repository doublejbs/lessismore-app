import CampSiteType from './CampSiteType';
import CampSiteTag from './CampSiteTag';

// 박지 상세(CampSite CS-3/CS-4)에서 쓰는 표시 라벨·문구 매핑.

// wild(노지) 유형에 warnings 유무와 무관하게 항상 노출하는 고정 규제 고지(CS-4).
export const WILD_NOTICE =
  '노지 야영은 지역에 따라 금지될 수 있습니다. 이용 전 반드시 현지 규정을 확인하세요.';

// 표시 라벨(CS-2). 데이터 값(CampSiteType enum: campground/shelter/wild)은 그대로 두고 표시만 바꾼다.
const TYPE_LABEL: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: '캠핑장',
  [CampSiteType.Shelter]: '대피소',
  [CampSiteType.Wild]: '백패킹',
};

const SOURCE_LABEL: Record<string, string> = {
  gocamping: '한국관광공사 고캠핑',
  knps: '국립공원공단',
  curated: '자체 큐레이션',
};

const TAG_LABEL: Record<CampSiteTag, string> = {
  [CampSiteTag.Mountain]: '산',
  [CampSiteTag.Beach]: '해변',
  [CampSiteTag.Valley]: '계곡',
  [CampSiteTag.Island]: '섬',
  [CampSiteTag.Lake]: '호수',
  [CampSiteTag.Plain]: '초원',
  [CampSiteTag.Forest]: '숲',
};

// 유형별 마커 색 — 배낭 상세 카테고리 팔레트(BagDetailSummaryView PALETTE) 재사용:
// 백패킹(wild)=파랑, 대피소=초록, 캠핑장(campground)=골드 (데이터 시각화 의미색 예외 — DesignTokens 컨벤션상 허용).
// 지도 마커(CampSiteMarkerView)와 유형 필터 칩의 색 도트(범례)가 함께 쓴다.
const TYPE_COLOR: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: '#FFD700',
  [CampSiteType.Shelter]: '#50C878',
  [CampSiteType.Wild]: '#4A90E2',
};

export const getCampSiteTypeLabel = (type: CampSiteType): string => {
  return TYPE_LABEL[type] ?? '';
};

export const getCampSiteTypeColor = (type: CampSiteType): string => {
  return TYPE_COLOR[type] ?? '#000000';
};

export const getCampSiteTagLabel = (tag: CampSiteTag): string => {
  return TAG_LABEL[tag] ?? '';
};

export const getCampSiteSourceLabel = (source: string): string => {
  return SOURCE_LABEL[source] ?? source;
};
