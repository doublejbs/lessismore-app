import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidShadow,
  LiquidType,
} from '@/constants/DesignTokens';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';

interface Props {
  location: BagLocation;
  // 연결 박지 스냅샷. 있으면 유형·지역·상세 이동을 노출하고, 없으면(삭제·비활성·조회 실패) 이름만 유지한다(DST-7).
  linkedSpot: CampSpot | null;
  onOpenSpotDetail: () => void;
  onOpenPicker: () => void;
  onOpenDirections: () => void;
}

// 액션 칩 높이 — 박지 상세(§10)의 액션 칩과 같은 값이다. 시각 높이 40을 44로 채우는 여유.
const ACTION_CHIP_HEIGHT = 40;
const ACTION_CHIP_HIT_SLOP = { top: 2, bottom: 2, left: 0, right: 0 };

/**
 * 여행지 허브(DST-8)의 여행지 정보 + 액션 (Liquid Depth).
 *
 * 박지 연결이면 종이 카드(상세 이동), 자유 위치면 위치명 행을 보여주고, 아래에 변경·길찾기
 * 액션 칩을 둔다. 유형 배지는 박지 상세와 같은 문법(잉크 면 + 라임 글자)이라 두 화면에서
 * 같은 사실이 같은 모양으로 읽힌다.
 */
const BagDestinationInfoView: FC<Props> = ({
  location,
  linkedSpot,
  onOpenSpotDetail,
  onOpenPicker,
  onOpenDirections,
}) => {
  const isLinked = location.campSpotId != null;
  // 저장된 박지 참조가 있고 실제 박지도 살아 있을 때만 상세 이동을 노출한다(DST-7).
  const canOpenDetail = isLinked && linkedSpot !== null;

  const card = canOpenDetail ? (
    <TouchableOpacity
      style={styles.card}
      onPress={onOpenSpotDetail}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel={`${location.name} 박지 상세 보기`}
    >
      <View style={styles.cardText}>
        <PretendardText style={styles.name} weight='semibold' numberOfLines={2}>
          📍 {location.name}
        </PretendardText>
        {linkedSpot && (
          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <PretendardText style={styles.badgeText} weight='semibold'>
                {getCampSiteTypeLabel(linkedSpot.type)}
              </PretendardText>
            </View>
            <PretendardText style={styles.metaText} numberOfLines={1}>
              {getCampSpotRegionLabel(linkedSpot)}
            </PretendardText>
          </View>
        )}
      </View>
      <View style={styles.detailHint}>
        <PretendardText style={styles.detailHintText} weight='medium'>
          박지 상세 보기
        </PretendardText>
        <Ionicons name='chevron-forward' size={16} color={Liquid.inkSubtle} />
      </View>
    </TouchableOpacity>
  ) : isLinked ? (
    // 박지 참조는 있으나 삭제·비활성·조회 실패 — 저장된 이름만 유지하고 상세 이동은 숨긴다(DST-7).
    <View style={styles.card}>
      <View style={styles.cardText}>
        <PretendardText style={styles.name} weight='semibold' numberOfLines={2}>
          📍 {location.name}
        </PretendardText>
      </View>
    </View>
  ) : (
    // 자유 위치 — 박지 카드 대신 위치명 행만 표시한다.
    <View style={styles.freeRow}>
      <Ionicons name='location-outline' size={20} color={Liquid.ink} />
      <PretendardText
        style={styles.freeName}
        weight='semibold'
        numberOfLines={2}
      >
        {location.name}
      </PretendardText>
    </View>
  );

  return (
    <View style={styles.container}>
      {card}

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionChip}
          onPress={onOpenPicker}
          activeOpacity={LiquidMotion.pressOpacity}
          hitSlop={ACTION_CHIP_HIT_SLOP}
          accessibilityRole='button'
          accessibilityLabel='여행지 변경'
        >
          <Ionicons name='swap-horizontal' size={17} color={Liquid.ink} />
          <PretendardText style={styles.actionLabel} weight='medium'>
            변경
          </PretendardText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionChip}
          onPress={onOpenDirections}
          activeOpacity={LiquidMotion.pressOpacity}
          hitSlop={ACTION_CHIP_HIT_SLOP}
          accessibilityRole='button'
          accessibilityLabel='네이버 지도로 길찾기'
        >
          <Ionicons name='navigate-outline' size={17} color={Liquid.ink} />
          <PretendardText style={styles.actionLabel} weight='medium'>
            길찾기
          </PretendardText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    marginTop: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.card,
    borderRadius: LiquidRadius.card,
    padding: LiquidLayout.cardPad,
    minHeight: LiquidLayout.touchMin,
  },
  cardText: {
    flex: 1,
    gap: 6,
  },
  name: {
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 박지 상세(§10)와 같은 유형 배지 — 잉크 면 위 라임 글자. 고정 높이 대신 minHeight.
  badge: {
    minHeight: 24,
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.ink,
  },
  badgeText: {
    fontSize: 11.5,
    color: Liquid.lime,
  },
  metaText: {
    flexShrink: 1,
    fontSize: 13,
    color: Liquid.inkTertiary,
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailHintText: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkTertiary,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: LiquidLayout.touchMin,
  },
  freeName: {
    flex: 1,
    fontSize: LiquidType.heading.fontSize,
    lineHeight: LiquidType.heading.lineHeight,
    color: Liquid.ink,
  },
  actionRow: {
    flexDirection: 'row',
    gap: LiquidLayout.listGap,
  },
  actionChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: ACTION_CHIP_HEIGHT,
    paddingHorizontal: 15,
    borderRadius: LiquidRadius.pill,
    backgroundColor: Liquid.surface,
    boxShadow: LiquidShadow.tile,
  },
  actionLabel: {
    fontSize: LiquidType.bodySm.fontSize,
    color: Liquid.ink,
  },
});

export default BagDestinationInfoView;
