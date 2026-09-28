import { StyleSheet } from 'react-native';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';

/** 회색 2열 타일의 최소 높이. 아이콘 + 제목 + 부제가 세로로 서는 치수다. */
const TILE_MIN_HEIGHT = 92;
/**
 * 강조 카드의 최소 높이. 가로 배치라 세로 타일보다 낮다(BD-10 "높이 축소") — 같은 높이로
 * 두면 전체 폭 카드가 화면의 3분의 1을 먹어 그 아래 장비 목록이 스크롤 밖으로 밀린다.
 */
const EMPHASIZED_MIN_HEIGHT = 64;

/**
 * 배낭 상세 액션 그리드 타일의 공용 면·치수 (BD-10).
 *
 * 여행지·메모·사용 기록·운동 기록·코스 다섯 타일이 **같은 값**을 쓴다. 타일마다 스타일을
 * 한 벌씩 들고 있으면 한 곳만 고쳐도 그리드가 어긋난다.
 *
 * 색은 여기에 두지 않는 것이 있다 — 강조 타일은 면이 잉크라 전경색을 각 컴포넌트가
 * 인라인으로 뒤집는다(`fg`/`subFg`). 기본값은 회색 타일 기준이다.
 */
const BagDetailActionTileStyles = StyleSheet.create({
  tile: {
    width: '48%',
    minHeight: TILE_MIN_HEIGHT,
    /**
     * 순백 지면 위 연회색 면(2026-08-11) — 지면이 흰색이 되면서 흰 종이 면은 보이지 않고
     * 그림자만 남았다. 그림자를 걷고 채움으로 면을 만든다(탐색 셀과 같은 규칙).
     * 강조 타일만 잉크 면이다 — 라임은 하단 주 액션 하나뿐이다.
     */
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 14,
    justifyContent: 'space-between',
  },
  /**
   * 상황형 강조 카드 (BD-10) — **검정 전체 폭 가로 카드**로 그리드 최상단에 선다.
   * 아이콘·라벨이 좌측, 값이 우측이다. 48% 세로 타일로 두면 그 화면에서 지금 중요한 것이
   * 나머지 넷과 같은 크기·같은 모양이 되어 "강조"가 배경색 차이 하나로만 남는다.
   */
  tileEmphasized: {
    width: '100%',
    minHeight: EMPHASIZED_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Acg.ink,
  },
  // 강조 카드 좌측 — 아이콘 + 라벨. 라벨이 길면 우측 값을 밀지 않고 스스로 줄인다.
  emphasizedLead: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  // 강조 카드 우측 — 값. 우측 정렬이라 값이 카드 끝에 붙는다.
  emphasizedValue: {
    alignItems: 'flex-end',
  },
  textWrap: {
    gap: 2,
  },
  title: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  subtitle: {
    ...AcgType.meta,
    color: Acg.textMuted,
  },
});

export default BagDetailActionTileStyles;
