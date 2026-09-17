import { FC, useMemo, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import PretendardText from '@/components/PretendardText';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupDetail from '@/model/group-detail/GroupDetail';
import {
  formatGroupDateRange,
  formatGroupWeight,
} from '@/model/group-format/GroupFormat';
import {
  BAG_CARD_MAP_LEVEL,
  buildStaticMapUrl,
  STATIC_MAP_REFERER,
} from '@/model/map/StaticMapUrl';

const MAP_BAND_HEIGHT = 110;
const ACTIVE_SPOT_STATUS = 'active';

interface Props {
  detail: GroupDetail;
}

/**
 * 그룹 상세 헤더 (GRP-4 · GRP-7).
 *
 * 등록 박지가 연결된 그룹만 상단에 지도 밴드를 둔다 — 자유 위치는 좌표를 저장하지 않으므로
 * 이름만 적는다(GRP-2 공개 원칙). 밴드는 커뮤니티 패킹 스냅샷과 같은 Static Map 단일 소스를 쓴다.
 */
const GroupDetailHeaderView: FC<Props> = ({ detail }) => {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [failedMapUrl, setFailedMapUrl] = useState<string | null>(null);
  const l10n = app.getL10n();
  const group = detail.getGroup();
  const campSpot = detail.getCampSpot();
  const mapWidth = windowWidth - AcgLayout.screenPadding * 2;
  const mapUrl = useMemo(() => {
    if (!campSpot || campSpot.status !== ACTIVE_SPOT_STATUS) {
      return null;
    }

    return buildStaticMapUrl({
      latitude: campSpot.location.latitude,
      longitude: campSpot.location.longitude,
      widthPx: mapWidth,
      heightPx: MAP_BAND_HEIGHT,
      level: BAG_CARD_MAP_LEVEL,
      withMarker: false,
    });
  }, [campSpot, mapWidth]);

  if (!group) {
    return null;
  }

  const showMapBand = mapUrl !== null && mapUrl !== failedMapUrl;
  const dateText = formatGroupDateRange(
    group.getStartDate(),
    group.getEndDate()
  );
  const destinationName = campSpot?.name ?? group.getDestinationName() ?? '';
  const meetingNote = group.getMeetingNote();
  const separator = l10n.t('group.detail.metaSeparator');
  const summaryText = [
    l10n.t('group.detail.summaryMembers', { count: detail.getMemberCount() }),
    l10n.t('group.detail.summaryBags', { count: detail.getLinkedBagCount() }),
    l10n.t('group.detail.summaryWeight', {
      weight: formatGroupWeight(detail.getTotalWeight()),
    }),
  ].join(separator);

  const renderDestination = () => {
    if (!destinationName) {
      return null;
    }

    const body = (
      <>
        <Ionicons name='location-outline' size={16} color={Acg.textMuted} />
        <PretendardText style={styles.destinationName} numberOfLines={1}>
          {destinationName}
        </PretendardText>
      </>
    );

    // 등록 박지면 기존 박지 상세 시트로 보낸다(CS-3). 자유 위치는 갈 곳이 없다.
    if (!campSpot) {
      return <View style={styles.destinationRow}>{body}</View>;
    }

    return (
      <TouchableOpacity
        style={styles.destinationRow}
        onPress={() => router.push(`/camp-site/${campSpot.id}`)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={destinationName}
      >
        {body}
        <Ionicons name='chevron-forward' size={16} color={Acg.textSecondary} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
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
      <PretendardText weight='semibold' style={styles.name}>
        {group.getName()}
      </PretendardText>
      {dateText ? (
        <PretendardText style={styles.date}>
          <AcgDisplayText style={styles.dateNumber}>{dateText}</AcgDisplayText>
        </PretendardText>
      ) : null}
      {renderDestination()}
      <PretendardText style={styles.summary}>{summaryText}</PretendardText>
      {meetingNote ? (
        <View style={styles.meetingNoteRow}>
          <Ionicons name='time-outline' size={16} color={Acg.textMuted} />
          <PretendardText style={styles.meetingNote}>
            {meetingNote}
          </PretendardText>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
  mapBand: {
    height: MAP_BAND_HEIGHT,
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: AcgRadius.thumb,
  },
  pinOverlay: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -15,
    marginTop: -40,
  },
  name: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  date: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  dateNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  destinationRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  destinationName: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 1,
  },
  summary: {
    ...AcgType.rowSubtitle,
    color: Acg.textMuted,
  },
  meetingNoteRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: AcgLayout.chipGap,
  },
  meetingNote: {
    ...AcgType.body,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(GroupDetailHeaderView);
