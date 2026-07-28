import { FC, ReactNode } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  GestureResponderEvent,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import Gear from '@/model/gear/Gear';
import { Color, Radius } from '@/constants/DesignTokens';

interface Props {
  gear: Gear;
  children?: ReactNode;
  onPress?: (e: GestureResponderEvent) => void;
}

// WH-1 창고 목록 행. 장비 썸네일은 표시하지 않으며(DataModel §1 장비 이미지 미제공 원칙)
// 빈 썸네일 박스도 남기지 않는 텍스트 우선 행 레이아웃이다.
// 행은 **좌 정체(브랜드·이름·색상) · 우 지표** 2열로 나눈다. 지표 컬럼은 사용률 배지가 위, 무게가 아래
// (보조 지표가 위·앵커가 아래인 메트릭 문법) — 무게가 행마다 같은 자리에 오므로 세로 스캔으로 비교할 수
// 있다. 정체 텍스트는 말줄임해 지표 컬럼을 침범하지 않는다.
const GearView: FC<Props> = ({ gear, children, onPress }) => {
  const weight = gear.getWeight();
  const hasUsedRate = gear.hasUsedRate();
  const hasMetrics = !!weight || hasUsedRate;

  const content = (
    <View style={styles.container}>
      <View style={styles.identityColumn}>
        <PretendardText
          style={styles.companyText}
          weight="bold"
          numberOfLines={1}
        >
          {gear.getDisplayCompany()}
        </PretendardText>

        <PretendardText
          style={styles.nameText}
          weight="bold"
          numberOfLines={2}
        >
          {gear.getDisplayName()}
        </PretendardText>

        {gear.getColor() ? (
          <PretendardText
            style={styles.colorText}
            weight="regular"
            numberOfLines={1}
          >
            {gear.getColor()}
          </PretendardText>
        ) : null}
      </View>

      {hasMetrics ? (
        <View style={styles.metricsColumn}>
          {hasUsedRate && (
            <View style={styles.usedRateBadge}>
              <PretendardText style={styles.usedRateText} weight="regular">
                사용률 {gear.getUsedRate()}%
              </PretendardText>
            </View>
          )}

          {weight ? (
            <PretendardText style={styles.weightText} weight="bold">
              {weight}g
            </PretendardText>
          ) : null}
        </View>
      ) : null}

      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.touchable}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

const styles = StyleSheet.create({
  touchable: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 0,
    gap: 12,
  },
  // 좌 정체 컬럼 — 브랜드·이름·색상.
  identityColumn: {
    flex: 1,
    gap: 6,
    overflow: 'hidden',
  },
  // 우 지표 컬럼 — 사용률 배지(위) + 무게(아래). 우측 정렬로 행마다 무게가 같은 자리에 온다.
  metricsColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  // WH-1: 브랜드는 제품 식별의 첫 축이라 이름(nameText)과 동일한 타이포로 표시한다.
  companyText: {
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  usedRateBadge: {
    borderRadius: Radius.card,
    backgroundColor: Color.chipInactiveBg,
    paddingVertical: 2,
    paddingHorizontal: 5,
  },
  usedRateText: {
    color: Color.textPrimary,
    fontSize: 11,
  },
  nameText: {
    fontSize: 15,
    lineHeight: 19,
    color: Color.textPrimary,
  },
  colorText: {
    fontSize: 13,
    color: Color.textTertiary,
  },
  weightText: {
    fontSize: 15,
    color: Color.textPrimary,
    textAlign: 'right',
  },
});

export default GearView;
