import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import {
  LedgerColor,
  LedgerFont,
  LedgerLayout,
  LedgerLine,
  LedgerNumber,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

/**
 * 수치가 없는 자리에 놓는 말. 눈으로 보는 것과 스크린리더가 읽는 것이 갈리지 않게
 * 호출부의 접근성 라벨도 이 상수를 쓴다.
 *
 * Liquid 세대의 `MISSING_WEIGHT_LABEL`(`무게 미입력`)과 말이 다르다 — 원장의 카피는
 * 짧은 사실이라 `없음`으로 적는다. 아직 이식하지 않은 화면은 옛 말을 계속 쓴다.
 */
export const LEDGER_MISSING_VALUE_LABEL = '무게 없음';

interface Props {
  /** 좌측 첫 줄. 1줄로 말줄임한다 — 행 높이가 이름 길이로 갈리면 세로 리듬이 깨진다 */
  name: string;
  /**
   * 이름 아래 메타 한 줄. 브랜드·사용률처럼 **행마다 종류가 같은 사실**을 호출부가
   * ` · `로 이어 붙여 넘긴다. 값이 없으면 줄째로 빠져 행이 한 줄이 된다.
   */
  meta?: string | undefined;
  /**
   * 우측 수치. **단위까지 붙은 한 문자열**을 호출부가 넘긴다 — 서식을 행마다 만들면 같은
   * 값이 화면마다 다르게 조판된다.
   *
   * 값이 없으면 `null`이다. 선택 프롭이 아닌 이유가 여기 있다: 미입력일 때 칸을 비우면
   * 우측 정렬축이 무너져 무게가 있는 행끼리도 비교가 안 된다. `null`이면 그 자리에
   * `무게 없음`을 놓아 칸을 지킨다.
   */
  value: string | null;
  /** 수치 뒤 자리 — 체크·담기 같은 행 액션용 */
  trailing?: ReactNode;
  /** 완료·미사용 항목. 목록에서 지우지 않고 잉크만 낮춘다 */
  dim?: boolean;
  /**
   * 행 **위** 헤어라인. 첫 행에는 주지 않는다(위 구역 경계가 이미 선을 그었다).
   *
   * 좌우 인셋 없이 **페이지 거터에서 거터까지** 긋는다 — 한쪽만 들여쓰면 선이 기울어
   * 보인다. 행이 가로 패딩을 갖지 않는 것도 같은 이유다.
   */
  divider?: boolean;
}

// 완료·미사용 행의 잉크. 지우지 않고 낮추기만 한다.
const DIM_OPACITY = 0.62;

/**
 * Ledger 목록 한 행.
 *
 * **카드가 아니다** — 면·그림자·모서리가 없고, 가로 패딩도 없다(페이지 거터가 좌우 축을
 * 잡는다). 좌측은 정체(이름 → 메타 한 줄), 우측은 콘덴스드 수치 하나다. 수치가 행마다
 * 같은 자리에 와야 세로로 비교된다(Ledger 시그니처 ①).
 */
const LedgerRow: FC<Props> = ({
  name,
  meta,
  value,
  trailing,
  dim = false,
  divider = false,
}) => {
  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        <View style={[styles.identity, dim && styles.dimmed]}>
          <PretendardText
            weight='semibold'
            style={styles.name}
            numberOfLines={1}
          >
            {name}
          </PretendardText>
          {meta ? (
            <PretendardText style={styles.meta} numberOfLines={1}>
              {meta}
            </PretendardText>
          ) : null}
        </View>

        {/* 값과 단위는 한 덩어리로 조판한다(`907g`) — 두 조각으로 갈리면 단위가 다른 값의
            일부처럼 읽힌다. 콘덴스드는 라틴 전용이라 `g`·`kg`에 안전하다.
            없는 자리(`무게 없음`)는 한글이라 콘덴스드를 쓸 수 없다 — 본문 서체로 한 급
            낮춰 수치와 구분하되 칸은 그대로 지킨다. */}
        {value !== null ? (
          <PretendardText
            style={[styles.value, dim && styles.dimmed]}
            numberOfLines={1}
          >
            {value}
          </PretendardText>
        ) : (
          <PretendardText
            style={[styles.missingValue, dim && styles.dimmed]}
            numberOfLines={1}
          >
            {LEDGER_MISSING_VALUE_LABEL}
          </PretendardText>
        )}

        {trailing}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    height: LedgerLine.hairline,
    backgroundColor: LedgerColor.line,
  },
  /**
   * 가로 패딩을 주지 않는다 — 페이지 거터가 좌우 축을 잡는다. 세로 패딩만으로 행 높이를
   * 만들고, 정보가 한 줄뿐인 행도 `rowMin`(44) 아래로 내려가지 않는다.
   */
  /**
   * 수치를 세로 중앙이 아니라 **이름 첫 줄에** 맞춘다(`alignItems: 'flex-start'`).
   * 중앙 정렬하면 두 줄 행에서 값이 이름과 메타 사이에 떠서, 눈이 한 줄로 이름↔값을
   * 훑지 못하고 어느 줄에 속한 값인지 매번 판단해야 한다. 원장의 수치는 항목 이름과
   * 같은 선에 있어야 한다.
   */
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: LedgerSpace.md,
    minHeight: LedgerLayout.rowMin,
    paddingVertical: LedgerSpace.md,
  },
  // `minWidth: 0`이 없으면 긴 이름이 수치 칸을 밀어낸다.
  identity: {
    flex: 1,
    minWidth: 0,
  },
  dimmed: {
    opacity: DIM_OPACITY,
  },
  name: {
    fontSize: LedgerType.heading.fontSize,
    lineHeight: LedgerType.heading.lineHeight,
    color: LedgerColor.ink,
  },
  meta: {
    fontSize: LedgerType.label.fontSize,
    lineHeight: LedgerType.label.lineHeight,
    color: LedgerColor.inkTertiary,
  },
  /**
   * 줄어들지 않는다 — 우측 정렬축은 이름 길이와 무관하게 같은 자리여야 한다.
   * `lineHeight`를 이름 줄과 같게 줘서 두 서체(콘덴스드·본문)의 첫 줄 baseline이 맞는다.
   */
  value: {
    flexShrink: 0,
    fontFamily: LedgerFont.condensed,
    fontSize: LedgerNumber.row.fontSize,
    lineHeight: LedgerType.heading.lineHeight,
    color: LedgerColor.ink,
  },
  // 수치가 아니라 상태를 말하는 자리라 메타와 같은 급으로 낮춘다.
  missingValue: {
    flexShrink: 0,
    fontSize: LedgerType.caption.fontSize,
    lineHeight: LedgerType.heading.lineHeight,
    color: LedgerColor.inkQuiet,
  },
});

export default LedgerRow;
