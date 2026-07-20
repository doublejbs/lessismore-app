import { FC } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';

interface Props {
  spots: CampSpot[];
  places: GeocodeResult[];
  searchingPlaces: boolean;
  onSelectSpot: (spot: CampSpot) => void;
  onSelectPlace: (place: GeocodeResult) => void;
}

// 통합 검색 결과(DST-4). 등록된 박지를 먼저, 카카오 장소를 다음에 보여준다.
// 결과 종류는 텍스트 배지로 구분한다 — 색·아이콘만으로 구분하지 않는다.
const BagDestinationSearchResultsView: FC<Props> = ({
  spots,
  places,
  searchingPlaces,
  onSelectSpot,
  onSelectPlace,
}) => {
  const hasNoResult = spots.length === 0 && places.length === 0;

  return (
    <View style={styles.card}>
      <ScrollView
        keyboardShouldPersistTaps='handled'
        keyboardDismissMode='on-drag'
        showsVerticalScrollIndicator={false}
      >
        {spots.length > 0 && (
          <>
            <PretendardText style={styles.sectionLabel} weight='semibold'>
              등록된 박지
            </PretendardText>
            {spots.map(spot => (
              <TouchableOpacity
                key={spot.id}
                style={styles.row}
                onPress={() => onSelectSpot(spot)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={`박지 ${spot.name}, ${getCampSpotRegionLabel(spot)}`}
              >
                <View style={styles.badge}>
                  <PretendardText style={styles.badgeText} weight='semibold'>
                    박지
                  </PretendardText>
                </View>
                <View style={styles.rowText}>
                  <PretendardText
                    style={styles.rowTitle}
                    weight='medium'
                    numberOfLines={1}
                  >
                    {spot.name}
                  </PretendardText>
                  <PretendardText style={styles.rowSubtitle} numberOfLines={1}>
                    {getCampSiteTypeLabel(spot.type)} ·{' '}
                    {getCampSpotRegionLabel(spot)}
                  </PretendardText>
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {places.length > 0 && (
          <>
            <PretendardText style={styles.sectionLabel} weight='semibold'>
              장소
            </PretendardText>
            {places.map((place, index) => (
              <TouchableOpacity
                key={`${place.latitude},${place.longitude},${index}`}
                style={styles.row}
                onPress={() => onSelectPlace(place)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={`장소 ${place.name}`}
              >
                <View style={styles.badge}>
                  <PretendardText style={styles.badgeText} weight='semibold'>
                    장소
                  </PretendardText>
                </View>
                <View style={styles.rowText}>
                  <PretendardText
                    style={styles.rowTitle}
                    weight='medium'
                    numberOfLines={1}
                  >
                    {place.name}
                  </PretendardText>
                  {place.subtitle && (
                    <PretendardText style={styles.rowSubtitle} numberOfLines={1}>
                      {place.subtitle}
                    </PretendardText>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* 장소 검색이 아직 도는 중이면 박지 결과만 먼저 보여주고 아래에 진행을 알린다. */}
        {searchingPlaces && (
          <View style={styles.searchingRow}>
            <ActivityIndicator size='small' color={Color.textSecondary} />
            <PretendardText style={styles.searchingText}>
              장소를 찾는 중이에요
            </PretendardText>
          </View>
        )}

        {!searchingPlaces && hasNoResult && (
          <PretendardText style={styles.emptyText}>
            검색 결과가 없어요
          </PretendardText>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.item,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    maxHeight: 320,
    paddingHorizontal: Spacing.item,
    shadowColor: Color.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  sectionLabel: {
    fontSize: 13,
    color: Color.textSecondary,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // 고정 높이 대신 여백으로 44pt 이상을 확보해 Dynamic Type에 대응한다.
    paddingVertical: 12,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: Radius.listThumb,
    backgroundColor: Color.chipInactiveBg,
  },
  badgeText: {
    fontSize: 11,
    color: Color.textTertiary,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  searchingText: {
    fontSize: 13,
    color: Color.textSecondary,
  },
  emptyText: {
    fontSize: 14,
    color: Color.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default BagDestinationSearchResultsView;
