import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import LiquidSkeletonBar from '@/components/liquid/LiquidSkeletonBar';
import useLiquidShimmer from '@/components/liquid/useLiquidShimmer';
import {
  LedgerColor,
  LedgerLine,
  LedgerNumber,
  LedgerSpace,
  LedgerType,
} from '@/constants/LedgerTokens';

interface Props {
  count?: number; // 스켈레톤 행 개수
}

// 막대 폭. 도착할 글자 길이의 대푯값이라 토큰이 아니라 이 파일의 값이다.
const NAME_BAR_WIDTH = '58%';
const META_BAR_WIDTH = 104;
const VALUE_BAR_WIDTH = 40;

/**
 * WH-1 창고 원장 스켈레톤 (Ledger).
 *
 * 도착할 원장과 **같은 골격**이라야 로드 후 자리가 튀지 않는다 — 카드·모서리·그림자는 없고,
 * 행 세로 패딩(12)·줄 높이(이름 22 + 메타 18)·행 사이 헤어라인·우측 수치 자리를 그대로 둔다.
 *
 * 셔머는 Liquid 세대의 것을 그대로 쓴다(`useLiquidShimmer` + `LiquidSkeletonBar`) — 왕복
 * 로직을 두 벌 만들 이유가 없고, 막대는 형태만 갖는 자리라 세대 문법이 걸리지 않는다.
 */
const SkeletonRow: FC<{ divider: boolean }> = ({ divider }) => {
  // 셔머·막대 색·모서리 모두 기본값(1 ↔ 0.5 / 반 주기 600ms / inkFaint / 4)을 그대로 쓴다.
  const opacity = useLiquidShimmer();

  return (
    <View>
      {divider ? <View style={styles.divider} /> : null}
      <View style={styles.row}>
        {/* 줄 상자는 도착할 텍스트의 라인박스와 같은 높이(22 / 18)이고 막대는 그 안에서
            글자 크기만큼만 차지한다 — 라인박스째 채우면 로드 후 글자가 얇아진 것처럼 보인다.
            메타 줄을 함께 그리는 이유: 브랜드가 있는 장비가 대부분이라 실제 행도 두 줄이다. */}
        <View style={styles.identity}>
          <View style={styles.nameLine}>
            <LiquidSkeletonBar
              opacity={opacity}
              width={NAME_BAR_WIDTH}
              height={LedgerType.heading.fontSize}
            />
          </View>
          <View style={styles.metaLine}>
            <LiquidSkeletonBar
              opacity={opacity}
              width={META_BAR_WIDTH}
              height={LedgerType.label.fontSize}
            />
          </View>
        </View>

        <View style={styles.valueLine}>
          <LiquidSkeletonBar
            opacity={opacity}
            width={VALUE_BAR_WIDTH}
            height={LedgerNumber.row.fontSize}
          />
        </View>
      </View>
    </View>
  );
};

const WarehouseSkeletonView: FC<Props> = ({ count = 8 }) => {
  return (
    <View>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonRow key={index} divider={index > 0} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  // 도착할 행과 같이 좌우 인셋 없이 거터에서 거터까지 — 로드 후 선이 움직이지 않는다.
  divider: {
    height: LedgerLine.hairline,
    backgroundColor: LedgerColor.line,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LedgerSpace.md,
    paddingVertical: LedgerSpace.md,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  nameLine: {
    height: LedgerType.heading.lineHeight,
    justifyContent: 'center',
  },
  metaLine: {
    height: LedgerType.label.lineHeight,
    justifyContent: 'center',
  },
  valueLine: {
    height: LedgerNumber.row.lineHeight,
    justifyContent: 'center',
  },
});

export default WarehouseSkeletonView;
