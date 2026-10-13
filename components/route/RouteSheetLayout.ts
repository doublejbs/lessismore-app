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
}: SheetLayoutInput): RouteSheetDetents => {
  const collapsed =
    SHEET_HANDLE_HEIGHT +
    CHIP_ROW_HEIGHT +
    SHEET_HEADER_PADDING_BOTTOM +
    SECTION_BORDER +
    AcgRow.minHeight +
    (hasFooter ? FOOTER_HEIGHT : 0) +
    listBottomInset;
  const expanded = Math.max(
    rootHeight - (topInset + EXPANDED_TOP_GAP),
    collapsed + AcgRow.minHeight * 2
  );
  const halfContent = graphHeight > 0 ? graphHeight : AcgRow.minHeight * 2;
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
