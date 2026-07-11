import { ComponentProps, FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';

interface Props {
  spot: CampSpot;
  onPress: () => void;
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// 시설 → 아이콘(Ionicons) + 한글 라벨 매핑 (요약 카드 시설 요약).
const FACILITY_META: Record<
  CampSiteFacility,
  { icon: IoniconName; label: string }
> = {
  [CampSiteFacility.Toilet]: { icon: 'male-female', label: '화장실' },
  [CampSiteFacility.Water]: { icon: 'water-outline', label: '식수' },
  [CampSiteFacility.Deck]: { icon: 'grid-outline', label: '데크' },
  [CampSiteFacility.Store]: { icon: 'storefront-outline', label: '매점' },
};

// 마커 탭 시 하단에 뜨는 박지 요약 카드(CS-2). 탭하면 상세로 이동한다.
const CampSiteSummaryCardView: FC<Props> = ({ spot, onPress }) => {
  return (
    <SafeAreaView edges={['bottom']} style={styles.wrap} pointerEvents='box-none'>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={onPress}
        accessibilityRole='button'
        accessibilityLabel={`${spot.name} 상세 보기`}
      >
        <View style={styles.headerRow}>
          <PretendardText style={styles.name} weight='bold' numberOfLines={1}>
            {spot.name}
          </PretendardText>
          <View style={styles.badge}>
            <PretendardText style={styles.badgeText} weight='medium'>
              {getCampSiteTypeLabel(spot.type)}
            </PretendardText>
          </View>
        </View>

        <View style={styles.regionRow}>
          <Ionicons
            name='location-outline'
            size={14}
            color={Color.textSecondary}
          />
          <PretendardText style={styles.region} numberOfLines={1}>
            {spot.region}
          </PretendardText>
        </View>

        {spot.facilities.length > 0 && (
          <View style={styles.facilityRow}>
            {spot.facilities.map(facility => {
              const meta = FACILITY_META[facility];

              if (!meta) {
                return null;
              }

              return (
                <View key={facility} style={styles.facilityItem}>
                  <Ionicons
                    name={meta.icon}
                    size={14}
                    color={Color.textSecondary}
                  />
                  <PretendardText style={styles.facilityLabel}>
                    {meta.label}
                  </PretendardText>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.detailHintRow}>
          <PretendardText style={styles.detailHint} weight='medium'>
            자세히 보기
          </PretendardText>
          <Ionicons
            name='chevron-forward'
            size={16}
            color={Color.textSecondary}
          />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: Radius.modal,
    backgroundColor: Color.background,
    gap: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    fontSize: 17,
    color: Color.textPrimary,
  },
  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  badgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  region: {
    flex: 1,
    fontSize: 13,
    color: Color.textSecondary,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  facilityLabel: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  detailHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  detailHint: {
    fontSize: 13,
    color: Color.textSecondary,
  },
});

export default CampSiteSummaryCardView;
