import { AcgRow } from '@/constants/DesignTokens';
import RouteSheetDetent from '@/model/route/RouteSheetDetent';

// 코스 화면(BD-11)·그룹 지도(GRP-10)가 함께 쓰는 바텀 시트의 단별 높이(pt, 화면 아래 끝에서 시트 위 끝까지).
export interface RouteSheetDetents {
  collapsed: number;
  half: number;
  expanded: number;
}

interface SheetLayoutInput {
  // 시트가 얹히는 지도 칸의 높이 — iOS는 화면 전체(투명 헤더), 안드로이드는 커스텀 헤더 아래.
  rootHeight: number;
  // 상단 오버레이가 시작하는 자리(헤더 아래 끝). 펼침은 이 아래 16까지 올라온다.
  topInset: number;
  // 목록 섹션의 아래 여백(세이프에어리어 + 12) — 화면이 목록에 주는 값과 같아야 한다.
  listBottomInset: number;
  // 고도 그래프의 실제 높이. 선택 코스에 고도가 없으면 0.
  graphHeight: number;
  // 목록 아래 `코스 추가`가 서는지(웹·상한과 무관하게 추가 가능한 화면이면 선다).
  hasFooter: boolean;
  /**
   * 코스 0개 빈 상태 카드(RD-9 #1, `RouteEmptyCardView`)가 서는지. 서면 첫 행·`코스 추가` 대신 카드 높이를 접힘에
   * 넣는다 — 접힘에서 카드의 주 액션이 잘리지 않게. 생략하면 `false`.
   */
  hasEmptyCard?: boolean;
  // 잰 카드 높이(위 여백 포함, `RouteEmptyCardView` `onMeasure`). 재기 전에는 어림값이다.
  emptyCardHeight?: number;
}

/** 손잡이 줄 높이 — 그래버(40×4)를 가운데 두고 위아래로 끌 자리를 준다. 칩 줄과 합쳐 끄는 영역은 44pt를 넘는다. */
export const SHEET_HANDLE_HEIGHT = 32;
/** 시트 머리의 칩 줄 아래 여백. */
export const SHEET_HEADER_PADDING_BOTTOM = 8;
// 세그먼트 칩(`CategoryChipView` 기본) 최소 높이 — Dynamic Type으로 커지면 시트 머리가 같이 자란다.
const CHIP_ROW_HEIGHT = 36;
// 목록 섹션 위 헤어라인.
const SECTION_BORDER = 1;
// `코스 추가` 줄 = 섹션 간격 8 + 줄 위 여백 4 + 버튼 48.
const FOOTER_HEIGHT = 60;
/**
 * 빈 상태 카드(`RouteEmptyCardView`) 높이 어림 — 재기 전(첫 프레임) 값. 위 여백 12 + 안쪽 여백 16·4 + 제목 24 + 4 +
 * 설명 두 줄 42 + 14 + 라임 버튼 48 + 6 + 권한 한 줄 18 + 14 + 텍스트 버튼 44. 잰 뒤에는 실제 높이(Dynamic Type 반영)다.
 */
export const ROUTE_EMPTY_CARD_HEIGHT_ESTIMATE = 246;
// 펼침의 위 끝과 헤더 사이 — 지도가 한 줄 남아 "지도 위에 얹힌 시트"로 읽힌다.
const EXPANDED_TOP_GAP = 16;

/**
 * 세 단 높이 (BD-11 · GRP-10).
 * - 접힘 = 손잡이 + 세그먼트 칩 줄 + 첫 행 + (`코스 추가`) + 아래 여백
 * - 기본 = 접힘 + 고도 그래프(고도가 없으면 행 2개) — 지금까지의 고정 높이(그래프 + 행 + `코스 추가`)와 같다
 * - 펼침 = 지도 칸 높이 − (헤더 아래 끝 + 16)
 * 작은 화면에서 단이 겹치지 않게 서로 적어도 행 하나만큼은 벌린다.
 */
export const getRouteSheetDetents = ({
  rootHeight,
  topInset,
  listBottomInset,
  graphHeight,
  hasFooter,
  hasEmptyCard = false,
  emptyCardHeight = ROUTE_EMPTY_CARD_HEIGHT_ESTIMATE,
}: SheetLayoutInput): RouteSheetDetents => {
  // 빈 상태 카드가 서면 첫 행·`코스 추가` 줄 대신 카드다(카드가 보이는 동안 푸터는 걷힌다).
  const body = hasEmptyCard
    ? emptyCardHeight
    : AcgRow.minHeight + (hasFooter ? FOOTER_HEIGHT : 0);
  const collapsed =
    SHEET_HANDLE_HEIGHT +
    CHIP_ROW_HEIGHT +
    SHEET_HEADER_PADDING_BOTTOM +
    SECTION_BORDER +
    body +
    listBottomInset;
  const expanded = Math.max(
    rootHeight - (topInset + EXPANDED_TOP_GAP),
    collapsed + AcgRow.minHeight * 2
  );
  // 빈 상태 카드는 접힘에서 이미 다 보인다 — 기본 단은 행 하나만큼만 더 올린다(아래 최소 간격).
  const halfContent =
    graphHeight > 0 ? graphHeight : hasEmptyCard ? 0 : AcgRow.minHeight * 2;
  const half = Math.min(
    Math.max(collapsed + halfContent, collapsed + AcgRow.minHeight),
    expanded - AcgRow.minHeight
  );

  return { collapsed, half, expanded };
};

export const getRouteSheetDetentHeight = (
  detents: RouteSheetDetents,
  detent: RouteSheetDetent
): number => {
  if (detent === RouteSheetDetent.Collapsed) {
    return detents.collapsed;
  }

  if (detent === RouteSheetDetent.Expanded) {
    return detents.expanded;
  }

  return detents.half;
};
