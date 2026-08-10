import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import {
  Liquid,
  LiquidLayout,
  LiquidMotion,
  LiquidRadius,
  LiquidType,
} from '@/constants/DesignTokens';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';

interface Props {
  reviews: BlogReview[];
  videos: VideoReview[];
  onPressReview: (review: BlogReview) => void;
  onPressVideo: (video: VideoReview) => void;
}

// 가로 카드 폭 — 화면 폭 안에서 다음 카드가 살짝 보여 스와이프할 것이 있음을 알린다.
const VIDEO_CARD_WIDTH = 200;

/**
 * 외부 후기 콘텐츠(유튜브 가로 카드 + 네이버 블로그 리스트) — 박지 상세(CS-3)와
 * 장비 상세(GD-6)가 함께 쓴다 (Liquid Depth, 2026-08-11 이식).
 *
 * 섹션 타이틀·래퍼는 화면별 톤이 달라 부모가 렌더한다. 두 소스 모두 0건이면 아무것도
 * 렌더하지 않는다. 이 모듈은 **면을 두지 않는다** — 두 소비 화면 모두 자기 섹션 껍데기를
 * 이미 갖고 있어(카드 또는 지면 위 리스트) 여기서 또 면을 깔면 카드 안 카드가 된다.
 */
const ReviewSectionView: FC<Props> = ({
  reviews,
  videos,
  onPressReview,
  onPressVideo,
}) => {
  if (reviews.length === 0 && videos.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      {videos.length > 0 ? (
        // 부모 좌우 패딩(20)을 상쇄해 풀블리드로 스크롤 — 좌우 여백이 대칭이 되고
        // 스와이프 가능 영역이 넓어진다. 시작 여백은 contentContainer 패딩으로 복원.
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.videoScrollBleed}
          contentContainerStyle={styles.videoScroll}
        >
          {videos.map(video => (
            <TouchableOpacity
              key={video.videoId}
              style={styles.videoCard}
              onPress={() => onPressVideo(video)}
              activeOpacity={LiquidMotion.pressOpacity}
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
              <PretendardText style={styles.videoChannel} numberOfLines={1}>
                {video.channelName}
              </PretendardText>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      {reviews.length > 0 ? (
        <View style={styles.reviewList}>
          {reviews.map((review, index) => (
            <TouchableOpacity
              key={review.link}
              style={styles.reviewItem}
              onPress={() => onPressReview(review)}
              activeOpacity={LiquidMotion.pressOpacity}
              accessibilityRole='link'
              accessibilityLabel={`후기: ${review.title}`}
            >
              {/* 두 번째 항목부터 위에 헤어라인 — 마지막 항목 아래 선이 남지 않아,
                  섹션 끝이 다음 섹션의 시작선처럼 읽히지 않는다. */}
              {index > 0 ? <View style={styles.divider} /> : null}
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
                <PretendardText style={styles.reviewMeta} numberOfLines={1}>
                  {review.postDate
                    ? `${review.bloggerName} · ${review.postDate}`
                    : review.bloggerName}
                </PretendardText>
              </View>
              {/* 앱 밖(브라우저)으로 나간다는 어포던스. */}
              <Ionicons
                name='open-outline'
                size={16}
                color={Liquid.inkSubtle}
              />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  videoScrollBleed: {
    marginHorizontal: -LiquidLayout.screenH,
  },
  videoScroll: {
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: LiquidLayout.screenH,
  },
  videoCard: {
    width: VIDEO_CARD_WIDTH,
    gap: 6,
  },
  // 썸네일 면은 사진이 도착할 자리색이다 — 카드 안 타일과 같은 가라앉은 면을 쓴다.
  videoThumb: {
    width: VIDEO_CARD_WIDTH,
    aspectRatio: 16 / 9,
    borderRadius: LiquidRadius.tile,
    backgroundColor: Liquid.surfaceSunken,
  },
  videoTitle: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.ink,
  },
  videoChannel: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
  reviewList: {
    marginTop: 4,
  },
  // 고정 높이 대신 minHeight로 HIG 44pt를 채운다.
  reviewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: LiquidLayout.touchMin,
    paddingVertical: 12,
  },
  divider: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Liquid.hairline,
  },
  reviewTextColumn: {
    flex: 1,
    gap: 4,
  },
  reviewTitle: {
    fontSize: 14,
    lineHeight: 20,
    color: Liquid.ink,
  },
  reviewSummary: {
    fontSize: LiquidType.bodySm.fontSize,
    lineHeight: LiquidType.bodySm.lineHeight,
    color: Liquid.inkSecondary,
  },
  reviewMeta: {
    fontSize: LiquidType.caption.fontSize,
    lineHeight: LiquidType.caption.lineHeight,
    color: Liquid.inkMuted,
  },
});

export default ReviewSectionView;
