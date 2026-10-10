import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import TripRecordCarouselView from '@/components/trip-record/TripRecordCarouselView';
import { Acg, AcgType, Color } from '@/constants/DesignTokens';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CommunityPost from '@/model/community/CommunityPost';
import { getSpotTripRecordMeta } from '@/model/trip-record/TripRecordCardMeta';
import app from '@/model/app/App';

interface Props {
  campSiteDetail: CampSiteDetail;
  // 후기 탭의 좌우 패딩 — 캐러셀을 시트 끝까지 넓히는 기준.
  horizontalPadding: number;
  // 지도 위 시트로 띄웠는지(CS-3). 시트면 상세로 갈 때 시트를 교체한다.
  inSheet: boolean;
}

/**
 * 박지 상세 `후기` 탭 맨 위 `다녀온 기록`(CS-11) — 이 박지에 다녀온 사람들의 여행 기록(CM-16).
 * 0건이면 머리까지 그리지 않고, 로딩 중 자리를 잡지 않는다(끝난 뒤 붙는다).
 * `전체 보기 ›`는 기록이 5건을 넘을 때만 둔다.
 */
const CampSiteTripRecordsSectionView: FC<Props> = ({
  campSiteDetail,
  horizontalPadding,
  inSheet,
}) => {
  const l10n = app.getL10n();
  const posts = campSiteDetail.getTripRecords();

  if (posts.length === 0) {
    return null;
  }

  const handlePress = (post: CommunityPost) => {
    campSiteDetail.openTripRecord(post, inSheet);
  };

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <PretendardText
          style={styles.sectionTitle}
          weight='semibold'
          accessibilityRole='header'
        >
          {l10n.t('tripRecord.campSite.title')}
        </PretendardText>
        {campSiteDetail.getHasMoreTripRecords() ? (
          <TouchableOpacity
            style={styles.moreLink}
            onPress={() => campSiteDetail.openAllTripRecords()}
            activeOpacity={0.7}
          // 링크 글자(줄높이 20)에 위아래 12를 더해 터치 영역 44pt를 맞춘다(HIG).
          hitSlop={12}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('tripRecord.campSite.more')}
          >
            <PretendardText weight='semibold' style={styles.moreText}>
              {l10n.t('tripRecord.campSite.more')}
            </PretendardText>
            <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <TripRecordCarouselView
        posts={posts}
        horizontalPadding={horizontalPadding}
        getMeta={getSpotTripRecordMeta}
        onPress={handlePress}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  // `이용자 후기`·`블로그·영상`과 같은 단 — 같은 탭의 섹션 머리가 나란히 읽힌다.
  sectionTitle: {
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
});

export default observer(CampSiteTripRecordsSectionView);
