import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import PointType from './PointType';

/**
 * 지도 포인트 표시 값의 단일 소스 (GRP-9 · BD-14).
 *
 * 박지 유형 마커(`model/camp-site/CampSiteLabels.ts`)와 같은 문법이다 — 데이터 값(enum)은
 * 그대로 두고 라벨·색·아이콘만 여기서 매핑한다. 마커와 유형 칩의 색 도트가 같은 값을 보게
 * 하려면 색이 한 곳에만 있어야 한다. 그룹 지도와 배낭 코스 화면이 함께 쓴다.
 */

// 칩·마커·목록이 함께 쓰는 유형 나열 순서. `물보급 → 쉼터 → 주의 → 메모`.
export const POINT_TYPES: readonly PointType[] = [
  PointType.Water,
  PointType.Shelter,
  PointType.Caution,
  PointType.Note,
];

const TYPE_LABEL_KEY: Record<PointType, string> = {
  [PointType.Water]: 'group.point.typeWater',
  [PointType.Shelter]: 'group.point.typeShelter',
  [PointType.Caution]: 'group.point.typeCaution',
  [PointType.Note]: 'group.point.typeNote',
};

/**
 * 유형별 마커 색. **의미색이라 토큰이 아니라 리터럴이다**(CLAUDE.md 예외 — 데이터 시각화 색).
 * 박지 유형색 3종(퍼플 `#7C3AED` · 초록 `#44F27E` · 골드 `#F2D744`)과 겹치지 않는 값을 골라
 * 같은 지도 위에서 박지 마커와 포인트 마커가 구분되게 한다. 메모는 정보가 아니라 메모라
 * 중성 회색을 준다.
 */
const TYPE_COLOR: Record<PointType, string> = {
  [PointType.Water]: '#2F8CFF',
  [PointType.Shelter]: '#1FA971',
  [PointType.Caution]: '#E5484D',
  [PointType.Note]: '#6E6E73',
};

const TYPE_ICON: Record<PointType, keyof typeof Ionicons.glyphMap> = {
  [PointType.Water]: 'water',
  [PointType.Shelter]: 'home',
  [PointType.Caution]: 'warning',
  [PointType.Note]: 'document-text',
};

export const getPointTypeLabel = (type: PointType): string => {
  const key = TYPE_LABEL_KEY[type];

  return key ? app.getL10n().t(key) : '';
};

export const getPointTypeColor = (type: PointType): string => {
  return TYPE_COLOR[type] ?? TYPE_COLOR[PointType.Note];
};

export const getPointTypeIcon = (
  type: PointType
): keyof typeof Ionicons.glyphMap => {
  return TYPE_ICON[type] ?? TYPE_ICON[PointType.Note];
};

/**
 * 등록 시각 표기 (GRP-9). 날짜 형식은 배낭·그룹 기간과 같은 단일 소스
 * (`bag.dateShortFormat`)를 쓴다 — 영어는 `Mar 3, 2026`, 일본어는 `2026/03/03`이라
 * 여기서만 점 구분 표기를 쓰면 같은 화면 안에서 날짜 문법이 갈린다.
 */
export const getPointDateText = (date: Date): string => {
  return dayjs(date).format(app.getL10n().t('bag.dateShortFormat'));
};

/**
 * 배낭 포인트 목록의 짧은 날짜 (BD-14 — 메타 `유형 · 10.09`). 한 여행 안의 포인트라 연도가
 * 늘 같아서 뺀다. 형식은 언어별로 `bag.point.dateFormat`이 정한다.
 */
export const getPointShortDateText = (date: Date): string => {
  return dayjs(date).format(app.getL10n().t('bag.point.dateFormat'));
};
