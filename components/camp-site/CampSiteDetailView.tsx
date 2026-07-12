import { FC } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteBagSelectSheetView from './CampSiteBagSelectSheetView';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { CampSiteReview, CampSiteVideo } from '@/model/camp-site/CampSiteReviewTypes';
import BagItem from '@/model/bag/BagItem';
import {
  WILD_NOTICE,
  getCampSiteSourceLabel,
  getCampSiteTagLabel,
  getCampSiteTypeLabel,
} from '@/model/camp-site/CampSiteLabels';

// 주의·규제 경고(CS-4)용 시맨틱 색(주황 계열) — 디자인 토큰에 없는 경고 전용 리터럴.
const WARNING_BG_COLOR = '#FFF4E5';
const WARNING_TEXT_COLOR = '#B65A00';

interface Props {
  campSiteDetail: CampSiteDetail;
}

type IoniconName = keyof typeof Ionicons.glyphMap;

// 시설 코드 → 아이콘·라벨(있는 것만 표시).
const FACILITY_META: Record<
  CampSiteFacility,
  { icon: IoniconName; label: string }
> = {
  [CampSiteFacility.Toilet]: { icon: 'male-female-outline', label: '화장실' },
  [CampSiteFacility.Water]: { icon: 'water-outline', label: '식수' },
  [CampSiteFacility.Deck]: { icon: 'grid-outline', label: '데크' },
  [CampSiteFacility.Store]: { icon: 'storefront-outline', label: '매점' },
};

const FACILITY_ORDER: CampSiteFacility[] = [
  CampSiteFacility.Toilet,
  CampSiteFacility.Water,
  CampSiteFacility.Deck,
  CampSiteFacility.Store,
];

const CampSiteDetailView: FC<Props> = ({ campSiteDetail }) => {
  const spot = campSiteDetail.getSpot();
  const reviews = campSiteDetail.getReviews();
  const videos = campSiteDetail.getVideos();
  const showBagSheet = campSiteDetail.shouldShowBagSheet();

  const handlePressClose = () => {
    campSiteDetail.close();
  };

  const handlePressDirections = () => {
    void campSiteDetail.openDirections();
  };

  const handlePressWeather = () => {
    campSiteDetail.openWeather();
  };

  const handlePressReview = (review: CampSiteReview) => {
    void campSiteDetail.openReview(review);
  };

  const handlePressVideo = (video: CampSiteVideo) => {
    void campSiteDetail.openVideo(video);
  };

  const handlePressSetBag = () => {
    void campSiteDetail.openBagSheet();
  };

  const handleCloseBagSheet = () => {
    campSiteDetail.closeBagSheet();
  };

  const handleSelectBag = (bag: BagItem) => {
    void campSiteDetail.selectBag(bag);
  };

  if (!spot) {
    return null;
  }

  const facilities = FACILITY_ORDER.filter(facility =>
    spot.facilities.includes(facility)
  );
  const hasWildNotice = spot.type === CampSiteType.Wild;
  const hasWarnings = Boolean(spot.warnings);
  // 블로그·유튜브 둘 다 0건이면 후기 섹션 자체를 렌더하지 않는다(빈 섹션 방지).
  const hasReviewContent = reviews.length > 0 || videos.length > 0;

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handlePressClose}
            style={styles.backButton}
            accessibilityLabel='뒤로 가기'
            accessibilityRole='button'
          >
            <Ionicons name='chevron-back' size={24} color={Color.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
        >
          {spot.imageUrl ? (
            <Image
              source={{ uri: spot.imageUrl }}
              style={styles.image}
              contentFit='cover'
            />
          ) : null}

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <PretendardText style={styles.name} weight='bold'>
                {spot.name}
              </PretendardText>
              <View style={styles.typeBadge}>
                <PretendardText style={styles.typeBadgeText} weight='semibold'>
                  {getCampSiteTypeLabel(spot.type)}
                </PretendardText>
              </View>
            </View>
            <PretendardText style={styles.region}>{spot.region}</PretendardText>

            {/* 지형·특징 태그(CS-3) — 비인터랙티브 칩 */}
            {(spot.tags ?? []).length > 0 && (
              <View style={styles.tagRow}>
                {(spot.tags ?? []).map(tag => (
                  <View key={tag} style={styles.tagChip}>
                    <PretendardText style={styles.tagChipText} weight='medium'>
                      #{getCampSiteTagLabel(tag)}
                    </PretendardText>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={styles.directionsButton}
              onPress={handlePressDirections}
              activeOpacity={0.7}
              accessibilityLabel='길찾기'
              accessibilityRole='button'
            >
              <Ionicons
                name='navigate-outline'
                size={18}
                color={Color.textPrimary}
              />
              <PretendardText
                style={styles.directionsText}
                weight='semibold'
              >
                길찾기
              </PretendardText>
            </TouchableOpacity>

            {hasWarnings ? (
              <View style={styles.warningBox}>
                <Ionicons
                  name='warning-outline'
                  size={18}
                  color={WARNING_TEXT_COLOR}
                />
                <PretendardText style={styles.warningText}>
                  {spot.warnings}
                </PretendardText>
              </View>
            ) : null}
            {hasWildNotice ? (
              <View style={styles.warningBox}>
                <Ionicons
                  name='warning-outline'
                  size={18}
                  color={WARNING_TEXT_COLOR}
                />
                <PretendardText style={styles.warningText}>
                  {WILD_NOTICE}
                </PretendardText>
              </View>
            ) : null}

            {spot.description ? (
              <View style={styles.section}>
                <PretendardText style={styles.description}>
                  {spot.description}
                </PretendardText>
              </View>
            ) : null}

            {facilities.length > 0 ? (
              <View style={styles.section}>
                <PretendardText style={styles.sectionTitle} weight='semibold'>
                  시설
                </PretendardText>
                <View style={styles.facilityRow}>
                  {facilities.map(facility => {
                    const meta = FACILITY_META[facility];

                    return (
                      <View key={facility} style={styles.facilityItem}>
                        <Ionicons
                          name={meta.icon}
                          size={18}
                          color={Color.textSecondary}
                        />
                        <PretendardText style={styles.facilityLabel}>
                          {meta.label}
                        </PretendardText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {spot.accessInfo ? (
              <View style={styles.section}>
                <PretendardText style={styles.sectionTitle} weight='semibold'>
                  접근 정보
                </PretendardText>
                <PretendardText style={styles.accessInfo}>
                  {spot.accessInfo}
                </PretendardText>
              </View>
            ) : null}

            <TouchableOpacity
              style={styles.weatherButton}
              onPress={handlePressWeather}
              activeOpacity={0.7}
              accessibilityLabel='주간 날씨'
              accessibilityRole='button'
            >
              <Ionicons
                name='partly-sunny-outline'
                size={18}
                color={Color.textPrimary}
              />
              <PretendardText style={styles.weatherButtonText} weight='semibold'>
                주간 날씨
              </PretendardText>
            </TouchableOpacity>

            {hasReviewContent ? (
              <View style={styles.section}>
                <PretendardText style={styles.sectionTitle} weight='semibold'>
                  후기
                </PretendardText>

                {videos.length > 0 ? (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.videoScroll}
                  >
                    {videos.map(video => (
                      <TouchableOpacity
                        key={video.videoId}
                        style={styles.videoCard}
                        onPress={() => handlePressVideo(video)}
                        activeOpacity={0.7}
                        accessibilityRole='link'
                        accessibilityLabel={`후기 영상: ${video.title}`}
                      >
                        <Image
                          source={{ uri: video.thumbnailUrl }}
                          style={styles.videoThumb}
                          contentFit='cover'
                        />
                        <PretendardText
                          style={styles.videoTitle}
                          weight='medium'
                          numberOfLines={2}
                        >
                          {video.title}
                        </PretendardText>
                        <PretendardText
                          style={styles.videoChannel}
                          numberOfLines={1}
                        >
                          {video.channelName}
                        </PretendardText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : null}

                {reviews.length > 0 ? (
                  <View style={styles.reviewList}>
                    {reviews.map(review => (
                      <TouchableOpacity
                        key={review.link}
                        style={styles.reviewItem}
                        onPress={() => handlePressReview(review)}
                        activeOpacity={0.7}
                        accessibilityRole='link'
                        accessibilityLabel={`후기: ${review.title}`}
                      >
                        <View style={styles.reviewTextColumn}>
                          <PretendardText
                            style={styles.reviewTitle}
                            weight='medium'
                            numberOfLines={2}
                          >
                            {review.title}
                          </PretendardText>
                          {review.summary ? (
                            <PretendardText
                              style={styles.reviewSummary}
                              numberOfLines={2}
                            >
                              {review.summary}
                            </PretendardText>
                          ) : null}
                          <PretendardText
                            style={styles.reviewMeta}
                            numberOfLines={1}
                          >
                            {review.postDate
                              ? `${review.bloggerName} · ${review.postDate}`
                              : review.bloggerName}
                          </PretendardText>
                        </View>
                        <Ionicons
                          name='open-outline'
                          size={16}
                          color={Color.textSecondary}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}
              </View>
            ) : null}

            <PretendardText style={styles.source}>
              출처 · {getCampSiteSourceLabel(spot.source)}
            </PretendardText>
          </View>

          <View style={styles.bottomSpacing} />
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.setBagButton}
            onPress={handlePressSetBag}
            activeOpacity={0.7}
            accessibilityLabel='배낭 여행지로 설정'
            accessibilityRole='button'
          >
            <PretendardText style={styles.setBagButtonText} weight='semibold'>
              배낭 여행지로 설정
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>

      <CampSiteBagSelectSheetView
        visible={showBagSheet}
        bags={campSiteDetail.getBags()}
        onClose={handleCloseBagSheet}
        onSelect={handleSelectBag}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    backgroundColor: Color.background,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: Color.thumbBg,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flexShrink: 1,
    fontSize: 20,
    lineHeight: 28,
    color: Color.textPrimary,
  },
  typeBadge: {
    backgroundColor: Color.chipInactiveBg,
    borderRadius: Radius.chip,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  region: {
    fontSize: 14,
    color: Color.textSecondary,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  tagChip: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.chip,
    backgroundColor: Color.chipInactiveBg,
  },
  tagChipText: {
    fontSize: 12,
    color: Color.textTertiary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.card,
    paddingVertical: 12,
  },
  directionsText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  weatherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Color.chipBorder,
    borderRadius: Radius.card,
    paddingVertical: 12,
  },
  weatherButtonText: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: WARNING_BG_COLOR,
    borderRadius: Radius.card,
    padding: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: WARNING_TEXT_COLOR,
  },
  section: {
    gap: 8,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    color: Color.textPrimary,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  facilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: 16,
    rowGap: 8,
  },
  facilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  facilityLabel: {
    fontSize: 14,
    color: Color.textPrimary,
  },
  accessInfo: {
    fontSize: 14,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  videoScroll: {
    gap: 12,
    paddingVertical: 4,
  },
  videoCard: {
    width: 200,
    gap: 6,
  },
  videoThumb: {
    width: 200,
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
    backgroundColor: Color.thumbBg,
  },
  videoTitle: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textPrimary,
  },
  videoChannel: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  reviewList: {
    gap: 4,
  },
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Color.borderLight,
  },
  reviewTextColumn: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Color.textPrimary,
  },
  reviewSummary: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textSecondary,
  },
  reviewMeta: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  source: {
    marginTop: 8,
    fontSize: 12,
    color: Color.textSecondary,
  },
  bottomSpacing: {
    height: 20,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Color.background,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  setBagButton: {
    backgroundColor: Color.textPrimary,
    borderRadius: Radius.card,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  setBagButtonText: {
    fontSize: 16,
    color: Color.background,
  },
});

export default observer(CampSiteDetailView);
