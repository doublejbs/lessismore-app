import { FC } from 'react';
import { View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import BagPacking from '@/model/bag-packing/BagPacking';
import LiquidCard from '@/components/liquid/LiquidCard';
import LiquidPillButton from '@/components/liquid/LiquidPillButton';
import { Liquid, LiquidFont, LiquidType } from '@/constants/DesignTokens';

interface Props {
  bagPacking: BagPacking;
}

// 완료 표식 원. 라임을 **면**으로 쓰지 않는다 — 이 화면의 라임 면은 진행 알약 하나뿐이라
// (뒤에 100% 알약이 떠 있다) 여기서는 잉크 원 + 라임 체크로 같은 뜻을 낸다.
const MARK_SIZE = 44;

/**
 * PK-5 패킹 완료 카드 (Liquid Depth).
 *
 * 전체를 챙긴 순간에만 지면 위로 떠오르는 종이 카드다. 액션은 `닫기` 하나 — 카드만 닫고
 * 패킹 화면에 남는다(상세 복귀는 헤더 뒤로가기).
 *
 * 스크림은 화면 전체를 덮어야 하므로 호출부가 세이프에어리어 **바깥**(루트 절대배치)에
 * 얹는다. 접근성 포커스도 같은 규칙으로 이 카드 안에 갇힌다(`accessibilityViewIsModal`).
 */
const BagPackingCompleteView: FC<Props> = ({ bagPacking }) => {
  const totalWeight = bagPacking.getTotalWeight();
  const showDDay = bagPacking.hasUpcomingDeparture();
  const dDay = bagPacking.getDDay();

  const handlePressClose = () => {
    bagPacking.dismissCompleteCard();
  };

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <LiquidCard tone='paper' radius='hero' padding={24} style={styles.card}>
        <View style={styles.mark}>
          <Ionicons name='checkmark' size={24} color={Liquid.lime} />
        </View>
        <PretendardText weight='bold' style={styles.title}>
          패킹 완료
        </PretendardText>
        {/* 부모 라인박스를 자식 최대 크기로 잡는다 — 없으면 큰 숫자의 어센더가 깎인다. */}
        <PretendardText style={styles.weightWrap} numberOfLines={1}>
          <PretendardText style={styles.weightValue}>
            {totalWeight}
          </PretendardText>
          <PretendardText style={styles.weightUnit}>kg</PretendardText>
        </PretendardText>
        {showDDay ? (
          <PretendardText style={styles.dDayText}>
            {`출발까지 ${dDay}일 남았어요`}
          </PretendardText>
        ) : null}
        <LiquidPillButton
          label='닫기'
          block
          onPress={handlePressClose}
          style={styles.cta}
        />
      </LiquidCard>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: Liquid.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    alignItems: 'center',
  },
  mark: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    borderRadius: MARK_SIZE / 2,
    backgroundColor: Liquid.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: LiquidType.title3.fontSize,
    lineHeight: LiquidType.title3.lineHeight,
    letterSpacing: LiquidType.title3.letterSpacing,
    color: Liquid.ink,
  },
  weightWrap: {
    marginTop: 6,
    fontSize: LiquidType.numXl.fontSize,
    lineHeight: LiquidType.numXl.fontSize,
  },
  weightValue: {
    fontFamily: LiquidFont.condensed,
    fontSize: LiquidType.numXl.fontSize,
    lineHeight: LiquidType.numXl.fontSize,
    letterSpacing: LiquidType.numXl.letterSpacing,
    color: Liquid.ink,
  },
  // 단위도 Archivo — 목업이 kg를 숫자와 같은 스팬에 넣는다(라틴 전용이라 안전).
  weightUnit: {
    fontFamily: LiquidFont.condensed,
    fontSize: 18,
    color: Liquid.inkMuted,
  },
  dDayText: {
    marginTop: 8,
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  cta: {
    marginTop: 22,
  },
});

export default observer(BagPackingCompleteView);
