import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { CommunityBagSnapshot } from '@/model/community/CommunityData';
import CommunityDetail from '@/model/community-detail/CommunityDetail';
import { getWeatherCodeInfo } from '@/model/weather/WeatherCode';
import {
  BAG_CARD_MAP_LEVEL,
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';
import {
  formatCommunitySnapshotDateRange,
  formatCommunityWeight,
} from '@/model/community/CommunityFormat';

const MAP_BAND_HEIGHT = 110;

interface Props {
  snapshot: CommunityBagSnapshot;
  detail: CommunityDetail;
}

const formatWeatherDate = (date: string): string => {
  return date.slice(5).replace('-', '.');
};

const CommunityDetailBagSnapshotView = observer(({ snapshot, detail }: Props) => {
  const { width: windowWidth } = useWindowDimensions();
  const [failedMapUrl, setFailedMapUrl] = useState<string | null>(null);
  const l10n = app.getL10n();
  const date = formatCommunitySnapshotDateRange(snapshot.startDate, snapshot.endDate);
  const spot = detail.getCampSpot();
  const mapWidth = windowWidth - AcgLayout.screenPadding * 2;
  const mapUrl = useMemo(() => {
    if (!spot || spot.status !== 'active') {
      return null;
    }

    return buildStaticMapUrl({
      latitude: spot.location.latitude,
      longitude: spot.location.longitude,
      widthPx: mapWidth,
      heightPx: MAP_BAND_HEIGHT,
      level: BAG_CARD_MAP_LEVEL,
      withMarker: false,
    });
  }, [mapWidth, spot]);
  const showMapBand = mapUrl !== null && mapUrl !== failedMapUrl;
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

  return (
    <View style={styles.card} accessible accessibilityLabel={cardLabel}>
      {showMapBand ? (
        <View style={styles.mapBand} accessible={false}>
          <Image
            source={{ uri: mapUrl, headers: { Referer: STATIC_MAP_REFERER } }}
            style={StyleSheet.absoluteFill}
            contentFit='cover'
            cachePolicy='memory-disk'
            onError={() => setFailedMapUrl(mapUrl)}
            accessible={false}
          />
          <View style={styles.pinOverlay} pointerEvents='none'>
            <SpotPinView />
          </View>
        </View>
      ) : null}
      <View style={styles.content}>
        <PretendardText style={styles.label}>
          {l10n.t('community.detail.bagSnapshot.label')}
        </PretendardText>
        <PretendardText weight='semibold' style={styles.name} numberOfLines={2}>
          {snapshot.name}
        </PretendardText>
        {date ? (
          <PretendardText style={styles.meta} numberOfLines={1}>
            {date}
          </PretendardText>
        ) : null}
        {snapshot.destinationName ? (
          <View style={styles.locationRow}>
            <Ionicons name='location-outline' size={14} color={Acg.textMuted} />
            <PretendardText style={styles.meta} numberOfLines={1}>
              {snapshot.destinationName}
            </PretendardText>
          </View>
        ) : null}
        <View style={styles.stats}>
          <View style={styles.weightBlock}>
            <PretendardText style={styles.statLabel}>
              {l10n.t('community.detail.bagSnapshot.totalWeight')}
            </PretendardText>
            <AcgDisplayText style={styles.weight}>
              {`${formatCommunityWeight(snapshot.totalWeight)}kg`}
            </AcgDisplayText>
          </View>
          <PretendardText style={styles.gearCount}>
            {l10n.t('community.detail.gearCount', {
              count: snapshot.itemCount,
            })}
          </PretendardText>
        </View>
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
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    marginTop: AcgLayout.communityCardGap,
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
  },
  mapBand: {
    height: MAP_BAND_HEIGHT,
    overflow: 'hidden',
    borderTopLeftRadius: AcgRadius.thumb,
    borderTopRightRadius: AcgRadius.thumb,
  },
  pinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -40,
  },
  content: {
    padding: AcgLayout.communityCardPadding,
  },
  label: { ...AcgType.meta, color: Acg.textMuted },
  name: { ...AcgType.sectionTitle, color: Acg.ink, marginTop: 4 },
  meta: { ...AcgType.rowSubtitle, color: Acg.textMuted },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  stats: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 12 },
  weightBlock: { gap: 2 },
  statLabel: { ...AcgType.meta, color: Acg.textMuted },
  weight: { ...AcgType.displayMedium, color: Acg.ink },
  gearCount: { ...AcgType.rowSubtitle, color: Acg.textMuted, marginLeft: 12, marginBottom: 2 },
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
