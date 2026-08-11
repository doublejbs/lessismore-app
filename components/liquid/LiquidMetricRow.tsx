import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidFont, LiquidMotion } from '@/constants/DesignTokens';
import { MISSING_WEIGHT_LABEL } from '@/model/gear/WeightFormat';

interface Props {
  brand?: string;
  name: string;
  /** 색상 · 사용률 등을 ' · '로 이어 붙인 한 줄 */
  meta?: string;
  /**
   * 우측 수치. **단위까지 붙은 문자열**을 호출부가 넘긴다(`formatGearWeight` — DM-26) —
   * 서식을 행마다 만들면 같은 값이 화면마다 다르게 조판된다.
   *
   * 값이 없으면 `null`이다. 선택 프롭이 아닌 이유가 여기 있다 — 미입력일 때 프롭을 빼면
   * 수치 칸이 통째로 사라져 목록의 우측 정렬축이 무너지고, 무게가 있는 행끼리도 비교가
   * 안 된다. `null`이면 그 자리에 `무게 미입력`을 놓아 칸을 지킨다.
   */
  value: string | null;
  /** 라임 텍스트로 강조 */
  accent?: boolean;
  /** 정체 앞에 붙는 자리 — 순위 배지처럼 행을 여는 표식용 */
  leading?: ReactNode;
  /**
   * 정체와 수치 **사이**의 자리. 행에 표식을 달면서도 수치 컬럼의 세로 정렬을 지켜야 할 때
   * 쓴다(배낭 상세 BD-5의 useless 로고 마크) — `trailing`에 두면 수치가 표식만큼 밀려
   * 행마다 무게 위치가 갈린다.
   */
  aside?: ReactNode;
  trailing?: ReactNode;
  /**
   * 정체·수치를 낮춘다 — 완료·미사용처럼 목록에서 지우지 않고 무게만 빼는 항목
   * (핸드오프 Interactions). `leading`·`aside`는 자체 투명도를 갖는다(호출측이 정한다).
   */
  dim?: boolean;
  /** 행 위 헤어라인(좌측 16 들여쓰기) — 카드 안에서 두 번째 행부터 켠다 */
  divider?: boolean;
  /**
   * 'sm'은 홈 창고 미리보기용 축약 행 — 수치를 Archivo 16으로 낮추고 메타를 inkMuted로
   * 올린다(목업 홈 절). 'md'는 창고 목록 기준.
   */
  size?: 'md' | 'sm';
  /**
   * 행 **본문**(패딩 제외)의 최소 높이. 같은 목록에서 `leading`(썸네일)이 붙은 행과 안 붙은
   * 행의 키가 갈리지 않게 호출부가 썸네일 한 변을 넘긴다(BD-1/WH-1의 `GEAR_THUMBNAIL_SIZE`).
   * 세로 패딩은 이 컴포넌트가 알아서 더하므로 호출부가 계산하지 않는다.
   * 주지 않으면 콘텐츠 높이를 그대로 따른다.
   */
  minContentHeight?: number;
}

// 행 세로 패딩. `minContentHeight`를 행 높이로 환산할 때도 쓰므로 상수로 둔다.
const ROW_PAD_V = 15;

/**
 * Liquid Depth 목록 한 행(핸드오프 MetricRow). 좌측은 정체(브랜드·이름·메타),
 * 우측은 수치 하나 — 수치가 늘 같은 자리에 와야 세로로 비교된다.
 */
const LiquidMetricRow: FC<Props> = ({
  brand,
  name,
  meta,
  value,
  accent = false,
  leading,
  aside,
  trailing,
  divider = false,
  dim = false,
  size = 'md',
  minContentHeight,
}) => {
  const isSmall = size === 'sm';

  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View
        style={[
          styles.row,
          minContentHeight !== undefined && {
            minHeight: minContentHeight + ROW_PAD_V * 2,
          },
        ]}
      >
        {leading}

        <View style={[styles.identity, dim && styles.dimmed]}>
          {brand ? (
            <PretendardText
              weight='semibold'
              style={styles.brand}
              numberOfLines={1}
            >
              {brand}
            </PretendardText>
          ) : null}
          <PretendardText
            weight='semibold'
            style={styles.name}
            numberOfLines={1}
          >
            {name}
          </PretendardText>
          {meta ? (
            <PretendardText
              style={[styles.meta, isSmall && styles.metaSm]}
              numberOfLines={1}
            >
              {meta}
            </PretendardText>
          ) : null}
        </View>

        {aside}

        {/* 값과 단위는 호출부가 한 덩어리로 만들어 넘긴다 — `907g`이 두 조각으로 갈리면
            단위가 다른 값의 일부처럼 읽힌다(카피 규칙: 숫자는 단위까지 한 덩어리).
            목업도 §6·§7·§8 모두 한 스팬이다. 콘덴스드는 라틴 전용이라 `g`·`kg`에 안전하다.
            미입력 자리는 한글이라 콘덴스드를 쓰지 못한다(Archivo Narrow에 한글 글리프가 없다) —
            본문 서체 보조 잉크로 떨어뜨려 수치와 구분한다. */}
        {value !== null ? (
          <PretendardText
            style={[
              styles.value,
              isSmall && styles.valueSm,
              accent && styles.valueAccent,
              dim && styles.dimmed,
            ]}
            numberOfLines={1}
          >
            {value}
          </PretendardText>
        ) : (
          <PretendardText
            style={[styles.missingValue, dim && styles.dimmed]}
            numberOfLines={1}
          >
            {MISSING_WEIGHT_LABEL}
          </PretendardText>
        )}

        {trailing}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
    marginLeft: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: ROW_PAD_V,
    paddingHorizontal: 16,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  dimmed: {
    opacity: LiquidMotion.doneOpacity,
  },
  brand: {
    fontSize: 12,
    color: Liquid.inkMuted,
  },
  name: {
    fontSize: 15,
    color: Liquid.ink,
  },
  meta: {
    fontSize: 12,
    color: Liquid.inkSubtle,
  },
  metaSm: {
    fontSize: 12.5,
    color: Liquid.inkMuted,
  },
  value: {
    flexShrink: 0,
    fontFamily: LiquidFont.condensed,
    fontSize: 20,
    color: Liquid.ink,
  },
  valueSm: {
    fontSize: 16,
  },
  valueAccent: {
    color: Liquid.limeInk,
  },
  // 수치가 아니라 상태를 말하는 자리라 메타와 같은 급으로 낮춘다 — 무게가 있는 행의
  // 큰 숫자 옆에서 이 행만 값이 없다는 사실이 조용히 읽히면 된다.
  missingValue: {
    flexShrink: 0,
    fontSize: 12.5,
    color: Liquid.inkSubtle,
  },
});

export default LiquidMetricRow;
