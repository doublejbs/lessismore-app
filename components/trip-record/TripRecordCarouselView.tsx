import { FC, Fragment, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import { Acg, AcgRadius, AcgType } from '@/constants/DesignTokens';
import CommunityPost from '@/model/community/CommunityPost';
import { TripRecordMetaPart } from '@/model/trip-record/TripRecordCardMeta';
import app from '@/model/app/App';

interface Props {
  posts: CommunityPost[];
  // 캐러셀이 놓인 곳의 좌우 패딩 — 가로 스크롤을 화면 끝까지 넓히고 첫 카드를 그 패딩에 맞춘다.
  horizontalPadding: number;
  getMeta: (post: CommunityPost) => TripRecordMetaPart[];
  onPress: (post: CommunityPost) => void;
}

const CARD_GAP = 10;
const CARD_PEEK = 28;
const CARD_PADDING = 16;
// 대표 사진 밴드 비율 4:3(HM-17·CS-11).
const PHOTO_ASPECT = 3 / 4;

/**
 * 여행 기록 가로 캐러셀(HM-17 홈 `최근 여행 기록`·CS-11 박지 `다녀온 기록` 공용).
 * 카드 = 대표 사진 밴드(4:3) + 한 줄 제목(16 medium 두 줄) + 메타 한 줄. 면·모서리·그림자 규칙은
 * HM-11 추천 카드와 같다. 사진 로드에 실패한 카드는 밴드 없이 제목·메타만 남긴다.
 */
const TripRecordCarouselView: FC<Props> = ({
  posts,
  horizontalPadding,
  getMeta,
  onPress,
}) => {
  const { width } = useWindowDimensions();
  const [failedPostIds, setFailedPostIds] = useState<Set<string>>(
    () => new Set()
  );
  const contentWidth = width - horizontalPadding * 2;
  const cardWidth = posts.length > 1 ? contentWidth - CARD_PEEK : contentWidth;
  const separator = app.getL10n().t('common.metaSeparator');

  const handleImageError = (postId: string) => {
    setFailedPostIds(previous => {
      if (previous.has(postId)) {
        return previous;
      }

      return new Set(previous).add(postId);
    });
  };

  const renderCard = (post: CommunityPost) => {
    const image = post.getRepresentativeImage();
    const showImage = image !== null && !failedPostIds.has(post.getId());
    const meta = getMeta(post);

    return (
      <TouchableOpacity
        key={post.getId()}
        style={[styles.card, { width: cardWidth }]}
        onPress={() => onPress(post)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={app.getL10n().t('tripRecord.card.accessibility', {
          title: post.getTitle(),
          meta: meta.map(part => part.text).join(separator),
        })}
      >
        {showImage ? (
          <Image
            source={{ uri: image.url }}
            style={[styles.photo, { height: cardWidth * PHOTO_ASPECT }]}
            contentFit='cover'
            cachePolicy='memory-disk'
            onError={() => handleImageError(post.getId())}
            accessible={false}
          />
        ) : null}
        <View style={styles.body}>
          <PretendardText
            weight='medium'
            style={styles.title}
            numberOfLines={2}
          >
            {post.getTitle()}
          </PretendardText>
          {meta.length > 0 ? (
            <PretendardText style={styles.meta} numberOfLines={1}>
              {meta.map((part, index) => (
                <Fragment key={`${part.text}-${index}`}>
                  {index > 0 ? separator : null}
                  {part.numeric ? (
                    <AcgDisplayText style={styles.metaNumber}>
                      {part.text}
                    </AcgDisplayText>
                  ) : (
                    part.text
                  )}
                </Fragment>
              ))}
            </PretendardText>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  if (posts.length === 0) {
    return null;
  }

  if (posts.length === 1) {
    return renderCard(posts[0]!);
  }

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      snapToInterval={cardWidth + CARD_GAP}
      snapToAlignment='start'
      decelerationRate='fast'
      style={{ marginHorizontal: -horizontalPadding }}
      contentContainerStyle={[
        styles.carouselContent,
        { paddingHorizontal: horizontalPadding },
      ]}
    >
      {posts.map(renderCard)}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  carouselContent: {
    alignItems: 'stretch',
    gap: CARD_GAP,
  },
  card: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
  },
  body: {
    gap: 6,
    padding: CARD_PADDING,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 메타 줄 안의 숫자 조각 — 둘러싼 글줄과 같은 단이다. 서체만 콘덴스드로 바뀐다.
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
});

export default observer(TripRecordCarouselView);
