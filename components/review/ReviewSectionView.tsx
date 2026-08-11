import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { AcgFontSize, Color, Radius } from '@/constants/DesignTokens';
import { BlogReview, VideoReview } from '@/model/review/ReviewTypes';

interface Props {
  reviews: BlogReview[];
  videos: VideoReview[];
  onPressReview: (review: BlogReview) => void;
  onPressVideo: (video: VideoReview) => void;
}

// 외부 후기 콘텐츠(유튜브 가로 카드 + 네이버 블로그 리스트) — 박지 상세(CS-3)와
// 장비 상세(GD-6)가 함께 쓴다. 섹션 타이틀·래퍼는 화면별 톤이 달라 부모가 렌더한다.
// 두 소스 모두 0건이면 아무것도 렌더하지 않는다.
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
              <PretendardText style={styles.videoChannel} numberOfLines={1}>
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
              onPress={() => onPressReview(review)}
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
                <PretendardText style={styles.reviewMeta} numberOfLines={1}>
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
  );
};

const styles = StyleSheet.create({
  section: {
    gap: 8,
  },
  videoScrollBleed: {
    marginHorizontal: -20,
  },
  videoScroll: {
    gap: 12,
    paddingVertical: 4,
    paddingHorizontal: 20,
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
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Color.textPrimary,
  },
  videoChannel: {
    fontSize: AcgFontSize.meta,
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
    fontSize: AcgFontSize.meta,
    lineHeight: 18,
    color: Color.textSecondary,
  },
  reviewMeta: {
    fontSize: AcgFontSize.meta,
    color: Color.textSecondary,
  },
});

export default ReviewSectionView;
