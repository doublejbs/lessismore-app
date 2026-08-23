import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import PretendardText from '@/components/PretendardText';
import { AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';
import app from '@/model/app/App';

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
              {app.getL10n().t('bagDestination.registeredSpots')}
            </PretendardText>
            {spots.map(spot => (
              <TouchableOpacity
                key={spot.id}
                style={styles.row}
                onPress={() => onSelectSpot(spot)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('bagDestination.spotResultLabel', { name: spot.name, region: getCampSpotRegionLabel(spot) })}
              >
                <View style={styles.badge}>
                  <PretendardText style={styles.badgeText} weight='semibold'>
                    {app.getL10n().t('bagDestination.spot')}
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
              {app.getL10n().t('bagDestination.places')}
            </PretendardText>
            {places.map((place, index) => (
              <TouchableOpacity
                key={`${place.latitude},${place.longitude},${index}`}
                style={styles.row}
                onPress={() => onSelectPlace(place)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('bagDestination.placeLabel', { name: place.name })}
              >
                <View style={styles.badge}>
                  <PretendardText style={styles.badgeText} weight='semibold'>
                    {app.getL10n().t('bagDestination.place')}
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
                    <PretendardText
                      style={styles.rowSubtitle}
                      numberOfLines={1}
                    >
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
              {app.getL10n().t('bagDestination.searching')}
            </PretendardText>
          </View>
        )}

        {!searchingPlaces && hasNoResult && (
          <PretendardText style={styles.emptyText}>
            {app.getL10n().t('search.resultEmpty')}
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
    ...AcgType.meta,
    color: Color.textSecondary,
    paddingTop: 12,
    paddingBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    // 여백으로 HIG 최소 터치 타깃 44pt를 확보한다.
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
    ...AcgType.meta,
    color: Color.textTertiary,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    ...AcgType.meta,
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
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  emptyText: {
    ...AcgType.rowSubtitle,
    color: Color.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default observer(BagDestinationSearchResultsView);
