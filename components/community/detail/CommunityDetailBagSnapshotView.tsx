import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import BagSnapshotSummaryCardView from '@/components/bag-snapshot/BagSnapshotSummaryCardView';
import SnapshotMapBandVariant from '@/components/bag-snapshot/SnapshotMapBandVariant';
import SnapshotMapBandView from '@/components/bag-snapshot/SnapshotMapBandView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { formatBagSnapshotWeightInKilograms } from '@/model/bag-snapshot/BagSnapshotFormat';
import { CommunityBagSnapshot } from '@/model/community/CommunityData';
import { formatCommunitySnapshotDateRange } from '@/model/community/CommunityFormat';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';

const ACTIVE_SPOT_STATUS = 'active';

interface Props {
  snapshot: CommunityBagSnapshot;
  detail: CommunityDetail;
}

const formatWeatherDate = (date: string): string => {
  return date.slice(5).replace('-', '.');
};

const CommunityDetailBagSnapshotView = observer(
  ({ snapshot, detail }: Props) => {
    const l10n = app.getL10n();
    const date = formatCommunitySnapshotDateRange(
      snapshot.startDate,
      snapshot.endDate
    );
    const spot = detail.getCampSpot();
    const weatherDays = snapshot.weather?.days ?? [];
    const locationLabel = snapshot.destinationName
      ? l10n.t('community.detail.bagSnapshot.location', {
          name: snapshot.destinationName,
        })
      : l10n.t('community.detail.bagSnapshot.locationNone');
    const cardLabel = l10n.t('community.detail.bagSnapshot.cardLabel', {
      name: snapshot.name,
      location: locationLabel,
    });
    // 등록 박지(활성)만 좌표가 있어 지도 밴드를 그릴 수 있다.
    const mapBand =
      spot && spot.status === ACTIVE_SPOT_STATUS ? (
        <SnapshotMapBandView
          latitude={spot.location.latitude}
          longitude={spot.location.longitude}
          variant={SnapshotMapBandVariant.Card}
        />
      ) : null;

    return (
      <BagSnapshotSummaryCardView
        label={l10n.t('community.detail.bagSnapshot.label')}
        name={snapshot.name}
        dateText={date}
        destinationName={snapshot.destinationName ?? ''}
        weightLabel={l10n.t('community.detail.bagSnapshot.totalWeight')}
        weightText={`${formatBagSnapshotWeightInKilograms(snapshot.totalWeight)}kg`}
        gearCountText={l10n.t('community.detail.gearCount', {
          count: snapshot.itemCount,
        })}
        mapBand={mapBand}
        accessibilityLabel={cardLabel}
      >
        {weatherDays.length > 0 ? (
          <View style={styles.weatherSection}>
            <PretendardText style={styles.weatherLabel}>
              {l10n.t('community.detail.bagSnapshot.weatherLabel')}
            </PretendardText>
            <View style={styles.weatherItems}>
              {weatherDays.map(day => {
                const info = getWeatherCodeInfo(day.code);

                return (
                  <View key={day.date} style={styles.weatherItem}>
                    <Ionicons name={info.icon} size={14} color={Acg.ink} />
                    <PretendardText style={styles.weatherText}>
                      {`${formatWeatherDate(day.date)}${l10n.t(
                        'community.detail.bagSnapshot.weatherSeparator'
                      )}${info.label} ${Math.round(day.tempMin)}°/${Math.round(
                        day.tempMax
                      )}°`}
                    </PretendardText>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </BagSnapshotSummaryCardView>
    );
  }
);

const styles = StyleSheet.create({
  weatherSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    gap: AcgLayout.chipGap,
  },
  weatherLabel: { ...AcgType.meta, color: Acg.textMuted },
  weatherItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AcgLayout.chipGap,
  },
  weatherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  weatherText: { ...AcgType.meta, color: Acg.ink },
});

export default CommunityDetailBagSnapshotView;
