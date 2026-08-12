import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
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

// 여행지 허브(DST-8)의 여행지 정보 + 액션. 박지 연결이면 박지 카드(상세 이동),
// 자유 위치면 위치명 행을 보여주고, 아래에 변경·길찾기 액션을 둔다.
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
      activeOpacity={0.7}
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
        <Ionicons
          name='chevron-forward'
          size={16}
          color={Color.textSecondary}
        />
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
      <Ionicons name='location-outline' size={20} color={Color.textPrimary} />
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
          style={styles.actionButton}
          onPress={onOpenPicker}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='여행지 변경'
        >
          <Ionicons
            name='swap-horizontal'
            size={18}
            color={Color.textPrimary}
          />
          <PretendardText style={styles.actionText} weight='medium'>
            변경
          </PretendardText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={onOpenDirections}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel='네이버 지도로 길찾기'
        >
          <Ionicons
            name='navigate-outline'
            size={18}
            color={Color.textPrimary}
          />
          <PretendardText style={styles.actionText} weight='medium'>
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
    backgroundColor: Color.surfaceMuted,
    borderRadius: Radius.card,
    padding: 16,
    minHeight: 44,
  },
  cardText: {
    flex: 1,
    gap: 6,
  },
  name: {
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.chipInactiveBg,
  },
  badgeText: {
    ...AcgType.meta,
    color: Color.textTertiary,
  },
  metaText: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  detailHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailHintText: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  freeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  freeName: {
    flex: 1,
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: Radius.input,
    borderWidth: 1,
    borderColor: Color.chipBorder,
  },
  actionText: {
    ...AcgType.control,
    color: Color.textPrimary,
  },
});

export default BagDestinationInfoView;
