import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import GroupPointType from '@/model/group/GroupPointType';

/**
 * 지도 포인트 표시 값의 단일 소스 (GRP-9).
 *
 * 박지 유형 마커(`model/camp-site/CampSiteLabels.ts`)와 같은 문법이다 — 데이터 값(enum)은
 * 그대로 두고 라벨·색·아이콘만 여기서 매핑한다. 마커와 유형 칩의 색 도트가 같은 값을 보게
 * 하려면 색이 한 곳에만 있어야 한다.
 */

// 칩·마커·목록이 함께 쓰는 유형 나열 순서. `물보급 → 쉼터 → 주의 → 메모`.
export const GROUP_POINT_TYPES: readonly GroupPointType[] = [
  GroupPointType.Water,
  GroupPointType.Shelter,
  GroupPointType.Caution,
  GroupPointType.Note,
];

const TYPE_LABEL_KEY: Record<GroupPointType, string> = {
  [GroupPointType.Water]: 'group.point.typeWater',
  [GroupPointType.Shelter]: 'group.point.typeShelter',
  [GroupPointType.Caution]: 'group.point.typeCaution',
  [GroupPointType.Note]: 'group.point.typeNote',
};

/**
 * 유형별 마커 색. **의미색이라 토큰이 아니라 리터럴이다**(CLAUDE.md 예외 — 데이터 시각화 색).
 * 박지 유형색 3종(퍼플 `#7C3AED` · 초록 `#44F27E` · 골드 `#F2D744`)과 겹치지 않는 값을 골라
 * 같은 지도 위에서 박지 마커와 포인트 마커가 구분되게 한다. 메모는 정보가 아니라 메모라
 * 중성 회색을 준다.
 */
const TYPE_COLOR: Record<GroupPointType, string> = {
  [GroupPointType.Water]: '#2F8CFF',
  [GroupPointType.Shelter]: '#1FA971',
  [GroupPointType.Caution]: '#E5484D',
  [GroupPointType.Note]: '#6E6E73',
};

const TYPE_ICON: Record<GroupPointType, keyof typeof Ionicons.glyphMap> = {
  [GroupPointType.Water]: 'water',
  [GroupPointType.Shelter]: 'home',
  [GroupPointType.Caution]: 'warning',
  [GroupPointType.Note]: 'document-text',
};

export const getGroupPointTypeLabel = (type: GroupPointType): string => {
  const key = TYPE_LABEL_KEY[type];

  return key ? app.getL10n().t(key) : '';
};

export const getGroupPointTypeColor = (type: GroupPointType): string => {
  return TYPE_COLOR[type] ?? TYPE_COLOR[GroupPointType.Note];
};

export const getGroupPointTypeIcon = (
  type: GroupPointType
): keyof typeof Ionicons.glyphMap => {
  return TYPE_ICON[type] ?? TYPE_ICON[GroupPointType.Note];
};

/**
 * 작성자 표시 (GRP-4 · GRP-12).
 *
 * `(나간 멤버)` 치환은 **화면에서 파생한다** — 저장된 `authorName`을 서버가 덮어쓰지 않으므로
 * `authorId`가 현재 멤버 목록에 없으면 이 문구로 바꾼다. 회원 탈퇴는 이와 달라 서버가
 * `authorName`을 비우므로, 이름이 비어 있으면 `(탈퇴한 사용자)`다.
 */
export const getGroupPointAuthorLabel = (
  authorId: string,
  authorName: string,
  memberIds: readonly string[]
): string => {
  const l10n = app.getL10n();

  if (!authorName.trim()) {
    return l10n.t('group.detail.withdrawnUser');
  }

  if (!memberIds.includes(authorId)) {
    return l10n.t('group.detail.leftMember');
  }

  return authorName;
};

/**
 * 등록 시각 표기 (GRP-9). 날짜 형식은 배낭·그룹 기간과 같은 단일 소스
 * (`bag.dateShortFormat`)를 쓴다 — 영어는 `Mar 3, 2026`, 일본어는 `2026/03/03`이라
 * 여기서만 점 구분 표기를 쓰면 같은 화면 안에서 날짜 문법이 갈린다.
 */
export const getGroupPointDateText = (date: Date): string => {
  return dayjs(date).format(app.getL10n().t('bag.dateShortFormat'));
};
