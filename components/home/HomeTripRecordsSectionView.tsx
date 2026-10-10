import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import TripRecordCarouselView from '@/components/trip-record/TripRecordCarouselView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import BagItem from '@/model/bag/BagItem';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import { getHomeTripRecordMeta } from '@/model/trip-record/TripRecordCardMeta';
import TripRecordEntrySource from '@/model/trip-record/TripRecordEntrySource';
import app from '@/model/app/App';

interface Props {
  posts: CommunityPost[];
  // 기록이 없는 가장 최근 끝난 내 여행. 있으면 머리 우측이 `내 여행 기록하기`다.
  unrecordedTrip: BagItem | null;
}

/**
 * 홈 `최근 여행 기록`(HM-17) — `useless가 고른 박지` 바로 아래(HM-14 순서 4).
 * 0건이면 렌더하지 않고, 로딩 중 자리를 잡지 않는다(조회가 끝난 뒤 붙는다).
 * 머리 우측 보조 액션은 하나만: 기록 안 한 끝난 여행이 있으면 `내 여행 기록하기 ›`, 아니면 `더 보기 ›`.
 * 라임을 쓰지 않는다 — 홈의 라임은 HM-1 CTA 하나다.
 */
const HomeTripRecordsSectionView: FC<Props> = ({ posts, unrecordedTrip }) => {
  const router = useRouter();
  const l10n = app.getL10n();

  if (posts.length === 0) {
    return null;
  }

  const handlePressCard = (post: CommunityPost) => {
    app.getAnalyticsManager()?.logClick('home_trip_record');
    router.push(`/community/${post.getId()}` as Href);
  };

  const handlePressAccessory = () => {
    if (unrecordedTrip) {
      app.getAnalyticsManager()?.logClick('home_trip_record_write');
      router.push(
        `/trip-record/${unrecordedTrip.getID()}?entrySource=${TripRecordEntrySource.Home}` as Href
      );

      return;
    }

    app.getAnalyticsManager()?.logClick('home_trip_record_more');
    router.navigate({
      pathname: '/community',
      params: { filter: CommunityFeedFilter.Packing },
    });
  };

  const accessoryLabel = unrecordedTrip
    ? l10n.t('tripRecord.home.write')
    : l10n.t('tripRecord.home.more');

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitle}>
          <AcgSectionHeaderView title={l10n.t('tripRecord.home.title')} />
        </View>
        <TouchableOpacity
          style={styles.moreLink}
          onPress={handlePressAccessory}
          activeOpacity={0.7}
          // 링크 글자(줄높이 20)에 위아래 12를 더해 터치 영역 44pt를 맞춘다(HIG).
          hitSlop={12}
          accessibilityRole='button'
          accessibilityLabel={accessoryLabel}
        >
          <PretendardText weight='semibold' style={styles.moreText}>
            {accessoryLabel}
          </PretendardText>
          <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
        </TouchableOpacity>
      </View>
      <TripRecordCarouselView
        posts={posts}
        horizontalPadding={AcgLayout.screenPadding}
        getMeta={getHomeTripRecordMeta}
        onPress={handlePressCard}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  // 섹션 머리 행 — 좌측 제목, 우측 보조 액션(HM-4 창고 미리보기와 같은 문법).
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
  },
  moreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    // 제목(18/24)의 첫 줄 세로 중앙에 링크(14/20)를 맞추는 광학 보정.
    paddingTop: 2,
  },
  moreText: {
    ...AcgType.control,
    color: Acg.textMuted,
  },
});

export default observer(HomeTripRecordsSectionView);
