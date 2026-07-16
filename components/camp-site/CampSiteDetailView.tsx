import { FC } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';
import CampSiteBagSelectSheetView from './CampSiteBagSelectSheetView';
import CampUserReviewSectionView from './CampUserReviewSectionView';
import ReviewSectionView from '@/components/review/ReviewSectionView';
import CampSiteDetail from '@/model/camp-site/CampSiteDetail';
import CampSiteType from '@/model/camp-site/CampSiteType';
import CampSiteFacility from '@/model/camp-site/CampSiteFacility';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';
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
  // 위치로 이동(CS-2) — 지도에서 연 시트에만 있다(공유 딥링크 진입엔 되돌릴 지도가 없어 undefined).
  onMoveToSpot?: (() => void) | undefined;
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

const CampSiteDetailView: FC<Props> = ({ campSiteDetail, onMoveToSpot }) => {
  const spot = campSiteDetail.getSpot();
  const reviews = campSiteDetail.getReviews();
  const videos = campSiteDetail.getVideos();
  const showBagSheet = campSiteDetail.shouldShowBagSheet();

  const handlePressClose = () => {
    campSiteDetail.close();
  };

  const handlePressMoveToSpot = () => {
    onMoveToSpot?.();
  };

  const handlePressNaverMap = () => {
    void campSiteDetail.openNaverMap();
  };

  const handlePressShare = () => {
    void campSiteDetail.share();
  };

  const handlePressWeather = () => {
    campSiteDetail.openWeather();
  };

  const handlePressReview = (review: BlogReview) => {
    void campSiteDetail.openReview(review);
  };

  const handlePressVideo = (video: VideoReview) => {
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

  const handleCreateBag = () => {
    campSiteDetail.createBagForSpot();
  };

  if (!spot) {
    return null;
  }

  const facilities = FACILITY_ORDER.filter(facility =>
    spot.facilities.includes(facility)
  );
  const hasWildNotice = spot.type === CampSiteType.Wild;
  const hasWarnings = Boolean(spot.warnings);

  return (
    <>
      <View style={styles.container}>
        <View style={styles.header}>
          {/* 상세는 지도 위 바텀 시트(CS-2)라 뒤로 가기가 아니라 닫기(X)를 둔다. */}
          <TouchableOpacity
            onPress={handlePressClose}
            style={styles.closeButton}
            accessibilityLabel='닫기'
            accessibilityRole='button'
          >
            <Ionicons name='close' size={24} color={Color.textPrimary} />
          </TouchableOpacity>

          {/* 헤더 우측 액션 — (지도 진입 시) 위치로 이동 + 공유 + 네이버 지도에서 열기(CS-2/CS-3/CS-7) */}
          <View style={styles.headerRight}>
            {onMoveToSpot ? (
              <TouchableOpacity
                onPress={handlePressMoveToSpot}
                style={styles.headerButton}
                accessibilityLabel='지도에서 이 박지 위치로 이동'
                accessibilityRole='button'
              >
                <Ionicons name='locate' size={22} color={Color.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handlePressShare}
              style={styles.headerButton}
              accessibilityLabel='공유'
              accessibilityRole='button'
            >
              <Ionicons
                name='share-outline'
                size={22}
                color={Color.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePressNaverMap}
              style={styles.headerButton}
              accessibilityLabel='네이버 지도에서 열기'
              accessibilityRole='button'
            >
              <Ionicons name='map-outline' size={22} color={Color.textPrimary} />
            </TouchableOpacity>
          </View>
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

            {/* 유저 후기(CS-8) — 별점 요약·리스트·작성 액션 */}
            <CampUserReviewSectionView campSiteDetail={campSiteDetail} />

            {/* 외부 후기(CS-3) — 공용 후기 콘텐츠(유튜브 카드 + 블로그 리스트) */}
            {reviews.length > 0 || videos.length > 0 ? (
              <View style={styles.section}>
                <PretendardText style={styles.sectionTitle} weight='semibold'>
                  블로그·영상
                </PretendardText>
                <ReviewSectionView
                  reviews={reviews}
                  videos={videos}
                  onPressReview={handlePressReview}
                  onPressVideo={handlePressVideo}
                />
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
        spotName={spot.name}
        onClose={handleCloseBagSheet}
        onSelect={handleSelectBag}
        onCreateNew={handleCreateBag}
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
  closeButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -10,
  },
  // 헤더 우측 액션 묶음(위치로 이동 + 공유 + 지도) — 닫기 대칭 위치.
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    marginRight: -10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
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
