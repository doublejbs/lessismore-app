import CampSiteType from './CampSiteType';
import CampSiteTag from './CampSiteTag';
import CampSiteDetailTab from './CampSiteDetailTab';
import { CampSpotData } from './CampSpotTypes';
import { AcgSemantic } from '@/constants/DesignTokens';
import app from '@/model/app/App';

// 박지 상세(CampSite CS-3/CS-4)에서 쓰는 표시 라벨·문구 매핑.

// wild(노지) 유형에 warnings 유무와 무관하게 항상 노출하는 고정 규제 고지(CS-4).
export const getCampSiteWildNotice = (): string =>
  app.getL10n().t('campSite.detail.notice');

// 표시 라벨(CS-2). 데이터 값(CampSiteType enum: campground/shelter/wild)은 그대로 두고 표시만 바꾼다.
const TYPE_LABEL_KEY: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: 'campSite.types.campground',
  [CampSiteType.Shelter]: 'campSite.types.shelter',
  [CampSiteType.Wild]: 'campSite.types.wild',
};

const SOURCE_LABEL_KEY: Record<string, string> = {
  gocamping: 'campSite.sources.gocamping',
  knps: 'campSite.sources.knps',
  curated: 'campSite.sources.curated',
};

const TAG_LABEL_KEY: Record<CampSiteTag, string> = {
  [CampSiteTag.Mountain]: 'campSite.tags.mountain',
  [CampSiteTag.Beach]: 'campSite.tags.beach',
  [CampSiteTag.Valley]: 'campSite.tags.valley',
  [CampSiteTag.Island]: 'campSite.tags.island',
  [CampSiteTag.Lake]: 'campSite.tags.lake',
  [CampSiteTag.Plain]: 'campSite.tags.plain',
  [CampSiteTag.Forest]: 'campSite.tags.forest',
};

/**
 * 유형별 마커 색 — 백패킹=퍼플, 대피소=초록, 캠핑장=골드.
 * 지도 마커(CampSiteMarkerView)와 유형 필터 칩의 색 도트(범례)가 함께 쓴다.
 *
 * 백패킹은 내 위치 마커의 파랑(`#2D8CFF`)과 혼동되지 않도록 퍼플(`#7C3AED`)을 쓴다
 * (2026-08-14 사용자 결정). 지도 배경의 도로·수계와 앱 라임 액센트와도 구분되는 값이다.
 */
const TYPE_COLOR: Record<CampSiteType, string> = {
  [CampSiteType.Campground]: AcgSemantic.spotCamping,
  [CampSiteType.Shelter]: AcgSemantic.spotShelter,
  [CampSiteType.Wild]: AcgSemantic.spotBackpacking,
};

// 상세 시트 탭 바의 표시 라벨(CS-3).
const DETAIL_TAB_LABEL_KEY: Record<CampSiteDetailTab, string> = {
  [CampSiteDetailTab.Overview]: 'campSite.tabs.overview',
  [CampSiteDetailTab.Weather]: 'campSite.tabs.weather',
  [CampSiteDetailTab.Review]: 'campSite.tabs.review',
};

export const getCampSiteDetailTabLabel = (tab: CampSiteDetailTab): string => {
  const key = DETAIL_TAB_LABEL_KEY[tab];

  return key ? app.getL10n().t(key) : '';
};

export const getCampSiteTypeLabel = (type: CampSiteType): string => {
  const key = TYPE_LABEL_KEY[type];

  return key ? app.getL10n().t(key) : '';
};

export const getCampSiteTypeColor = (type: CampSiteType): string => {
  return TYPE_COLOR[type] ?? '#000000';
};

export const getCampSiteTagLabel = (tag: CampSiteTag): string => {
  const key = TAG_LABEL_KEY[tag];

  return key ? app.getL10n().t(key) : '';
};

export const getCampSiteSourceLabel = (source: string): string => {
  const key = SOURCE_LABEL_KEY[source];

  return key ? app.getL10n().t(key) : source;
};

// 지역 표시 라벨(DM-17) — `강원 평창군`처럼 시/도 + 시/군/구를 합쳐 낸다.
// city 백필 이전 문서엔 city가 없으므로 region만 내는 폴백이 필수다.
export const getCampSpotRegionLabel = (spot: CampSpotData): string => {
  if (!spot.city) {
    return spot.region;
  }

  return `${spot.region} ${spot.city}`;
};
