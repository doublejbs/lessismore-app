import CampSiteType from './CampSiteType';
import CampSiteTag from './CampSiteTag';
import CampSiteDetailTab from './CampSiteDetailTab';
import { CampSpotData } from './CampSpotTypes';
import { AcgSemantic } from '@/constants/DesignTokens';

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

/**
 * 유형별 마커 색 — 백패킹=파랑, 대피소=초록, 캠핑장=골드.
 * 지도 마커(CampSiteMarkerView)와 유형 필터 칩의 색 도트(범례)가 함께 쓴다.
 *
 * **라임과 같은 톤이다**(2026-08-13 사용자 결정). 색상(hue)은 유형 구분을 위해 유지하고
 * 채도·명도를 라임(#C8F244, HSL 74°/87%/61%)에 맞춰 재계산한 `AcgSemantic.spot*` 값을
 * 쓴다 — 지도의 액센트(라임 현위치 버튼)와 마커·범례가 한 팔레트로 읽힌다.
 * (이력: 2026-08-04에는 배낭 카테고리 계열(bagBase·bagClothing·bagCooking)의 저채도
 * 값이었다 — 따뜻한 지면 세대의 선택이라 순백·라임 세대에서는 탁하게 가라앉았다.)
 */
const TYPE_COLOR: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: AcgSemantic.spotCamping,
  [CampSiteType.Shelter]: AcgSemantic.spotShelter,
  [CampSiteType.Wild]: AcgSemantic.spotBackpacking,
};

// 상세 시트 탭 바의 표시 라벨(CS-3).
const DETAIL_TAB_LABEL: Record<CampSiteDetailTab, string> = {
  [CampSiteDetailTab.Overview]: '개요',
  [CampSiteDetailTab.Weather]: '날씨',
  [CampSiteDetailTab.Review]: '후기',
};

export const getCampSiteDetailTabLabel = (tab: CampSiteDetailTab): string => {
  return DETAIL_TAB_LABEL[tab] ?? '';
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

// 지역 표시 라벨(DM-17) — `강원 평창군`처럼 시/도 + 시/군/구를 합쳐 낸다.
// city 백필 이전 문서엔 city가 없으므로 region만 내는 폴백이 필수다.
export const getCampSpotRegionLabel = (spot: CampSpotData): string => {
  if (!spot.city) {
    return spot.region;
  }

  return `${spot.region} ${spot.city}`;
};
