import { FC, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
} from '@/constants/DesignTokens';
import {
  getCampSiteTypeColor,
  getCampSiteTypeLabel,
  getCampSpotRegionLabel,
} from '@/model/camp-site/CampSiteLabels';
import { RecommendedSpot } from '@/model/feed/FeedContentTypes';
import { setPendingCampSite } from '@/model/camp-site/CampSiteMapHandoff';

interface Props {
  recommendations: RecommendedSpot[];
}

const CARD_GAP = 10;
const CARD_PEEK = 28;
const PHOTO_BAND_HEIGHT = 110;
const CARD_PADDING = 16;

// HM-11: 운영자 추천 박지 캐러셀. 지도 탭 상세 진입은 지도 마커 탭의 기존 경로를 재사용한다.
const HomeRecommendedSpotsView: FC<Props> = ({ recommendations }) => {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [activePage, setActivePage] = useState(0);
  const [failedImageKeys, setFailedImageKeys] = useState<Set<string>>(
    () => new Set()
  );

  if (recommendations.length === 0) {
    return null;
  }

  const handlePress = (spotId: string) => {
    setPendingCampSite(spotId);
    router.push('/map');
  };

  const handleImageError = (imageKey: string) => {
    setFailedImageKeys(previous => {
      if (previous.has(imageKey)) {
        return previous;
      }

      return new Set(previous).add(imageKey);
    });
  };

  const cardWidth =
    recommendations.length > 1
      ? width - AcgLayout.screenPadding * 2 - CARD_PEEK
      : width - AcgLayout.screenPadding * 2;

  const renderCard = ({ content, spot }: RecommendedSpot) => {
    const typeLabel = getCampSiteTypeLabel(spot.type);
    const regionLabel = getCampSpotRegionLabel(spot);
    const imageKey = content.imageUrl
      ? `${spot.id}:${content.imageUrl}`
      : null;
    const showImageBand =
      imageKey !== null && !failedImageKeys.has(imageKey);

    return (
      <TouchableOpacity
        key={spot.id}
        style={[styles.card, { width: cardWidth }]}
        onPress={() => handlePress(spot.id)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={`${spot.name}, ${typeLabel}, ${regionLabel}, 지도에서 보기`}
      >
        {showImageBand ? (
          <Image
            source={{ uri: content.imageUrl! }}
            style={styles.photoBand}
            contentFit='cover'
            cachePolicy='memory-disk'
            onError={() => handleImageError(imageKey!)}
            accessible={false}
          />
        ) : null}
        <View
          style={[styles.body, !showImageBand && styles.bodyWithoutImage]}
        >
          <PretendardText
            weight='medium'
            style={styles.title}
            numberOfLines={2}
          >
            {spot.name}
          </PretendardText>
          <View style={styles.metaRow}>
            <View
              style={[
                styles.typeDot,
                { backgroundColor: getCampSiteTypeColor(spot.type) },
              ]}
            />
            <PretendardText style={styles.meta} numberOfLines={1}>
              {`${typeLabel} · ${regionLabel}`}
            </PretendardText>
          </View>
          {content.summary ? (
            <PretendardText style={styles.summary} numberOfLines={2}>
              {content.summary}
            </PretendardText>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const visibleImage = recommendations.find(
    ({ content, spot }) =>
      Boolean(content.imageUrl) &&
      !failedImageKeys.has(`${spot.id}:${content.imageUrl}`)
  );

  return (
    <View style={styles.section}>
      <AcgSectionHeaderView title='useless가 고른 박지' />
      {recommendations.length === 1 ? (
        renderCard(recommendations[0]!)
      ) : (
        <>
          <ScrollView
            horizontal={true}
            showsHorizontalScrollIndicator={false}
            snapToInterval={cardWidth + CARD_GAP}
            snapToAlignment='start'
            decelerationRate='fast'
            style={styles.carousel}
            contentContainerStyle={styles.carouselContent}
            onScroll={event => {
              const page = Math.round(
                event.nativeEvent.contentOffset.x / (cardWidth + CARD_GAP)
              );

              setActivePage(
                Math.min(Math.max(page, 0), recommendations.length - 1)
              );
            }}
            scrollEventThrottle={16}
          >
            {recommendations.map(renderCard)}
          </ScrollView>
          <View style={styles.pageDots} accessible={false}>
            {recommendations.map(({ spot }, index) => (
              <View
                key={spot.id}
                style={[
                  styles.pageDot,
                  index === activePage && styles.pageDotActive,
                ]}
              />
            ))}
          </View>
        </>
      )}
      {visibleImage?.content.imageAttribution ? (
        <PretendardText style={styles.credit}>
          {visibleImage.content.imageAttribution}
        </PretendardText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 26,
  },
  carousel: {
    marginHorizontal: -AcgLayout.screenPadding,
  },
  carouselContent: {
    alignItems: 'stretch',
    gap: CARD_GAP,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  card: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
  },
  photoBand: {
    width: '100%',
    height: PHOTO_BAND_HEIGHT,
  },
  body: {
    gap: 6,
    padding: CARD_PADDING,
  },
  bodyWithoutImage: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  summary: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Acg.hairline,
  },
  pageDotActive: {
    backgroundColor: Acg.ink,
  },
  credit: {
    ...AcgType.meta,
    color: Acg.textMuted,
    marginTop: 10,
    textAlign: 'left',
  },
});

export default HomeRecommendedSpotsView;
