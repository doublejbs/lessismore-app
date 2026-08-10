import { FC, ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidFont } from '@/constants/DesignTokens';

interface Props {
  brand?: string;
  name: string;
  /** 색상 · 사용률 등을 ' · '로 이어 붙인 한 줄 */
  meta?: string;
  value?: string | number;
  unit?: string;
  /** 라임 텍스트로 강조 */
  accent?: boolean;
  trailing?: ReactNode;
  /** 행 위 헤어라인(좌측 16 들여쓰기) — 카드 안에서 두 번째 행부터 켠다 */
  divider?: boolean;
  /**
   * 'sm'은 홈 창고 미리보기용 축약 행 — 수치를 Archivo 16으로 낮추고 단위를 값과
   * 같은 색으로 붙이며, 메타를 inkMuted로 올린다(목업 홈 절). 'md'는 창고 목록 기준.
   */
  size?: 'md' | 'sm';
}

/**
 * Liquid Depth 목록 한 행(핸드오프 MetricRow). 좌측은 정체(브랜드·이름·메타),
 * 우측은 수치 하나 — 수치가 늘 같은 자리에 와야 세로로 비교된다.
 */
const LiquidMetricRow: FC<Props> = ({
  brand,
  name,
  meta,
  value,
  unit = 'g',
  accent = false,
  trailing,
  divider = false,
  size = 'md',
}) => {
  const isSmall = size === 'sm';
  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        <View style={styles.identity}>
          {brand ? (
            <PretendardText
              weight='semibold'
              style={styles.brand}
              numberOfLines={1}
            >
              {brand}
            </PretendardText>
          ) : null}
          <PretendardText weight='semibold' style={styles.name} numberOfLines={1}>
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

        {value !== undefined && value !== null ? (
          <PretendardText style={styles.valueWrap} numberOfLines={1}>
            <PretendardText
              style={[
                styles.value,
                isSmall && styles.valueSm,
                accent && styles.valueAccent,
              ]}
            >
              {String(value)}
            </PretendardText>
            <PretendardText
              style={[
                styles.unit,
                // 축약 행은 단위를 따로 낮추지 않는다 — `907g`이 한 덩어리로 읽혀야 한다.
                isSmall && styles.unitSm,
                isSmall && accent && styles.valueAccent,
              ]}
            >
              {unit}
            </PretendardText>
          </PretendardText>
        ) : null}

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
    paddingVertical: 15,
    paddingHorizontal: 16,
  },
  identity: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
  valueWrap: {
    flexShrink: 0,
  },
  value: {
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
  unit: {
    fontSize: 12,
    color: Liquid.inkSubtle,
  },
  unitSm: {
    fontFamily: LiquidFont.condensed,
    fontSize: 16,
    color: Liquid.ink,
  },
});

export default LiquidMetricRow;
