import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import CampSpotStore from './CampSpotStore';
import FeedContentType from '../feed/FeedContentType';
import ImageLicense from '../feed/ImageLicense';
import { FeedContentData, RecommendedSpot } from '../feed/FeedContentTypes';

// 홈 운영자 추천 박지 조회·참조 조인 (Home HM-11, DataModel DM-27).
class FeedContentStore {
  // 큐레이션은 소량이며, 초안이 최신 30건을 잠식할 수 있어 50건을 넉넉히 읽고 발행 여부를 거른다.
  private static readonly PUBLISHED_CONTENT_LIMIT = 50;
  public static readonly SPOT_LIMIT = 5;

  public constructor(
    private readonly firebase: Firebase,
    private readonly campSpotStore: CampSpotStore
  ) {}

  public async getRecommendedSpots(): Promise<RecommendedSpot[]> {
    const contents = (await this.getPublishedContents())
      .filter(content => content.type === FeedContentType.SpotIntro)
      .slice(0, FeedContentStore.SPOT_LIMIT);

    const joined = await Promise.all(
      contents.map(async content => {
        if (!content.relatedSpotId) {
          return null;
        }

        const spot = await this.campSpotStore.getSpot(content.relatedSpotId);

        if (!spot) {
          return null;
        }

        return { content, spot };
      })
    );

    return joined.filter(
      (item): item is RecommendedSpot => item !== null
    );
  }

  private async getPublishedContents(): Promise<FeedContentData[]> {
    try {
      const snapshot = await getDocs(
        query(
          collection(this.firebase.getStore(), 'feed-content'),
          orderBy('publishedAt', 'desc'),
          limit(FeedContentStore.PUBLISHED_CONTENT_LIMIT)
        )
      );

      return snapshot.docs
        .map(document =>
          FeedContentStore.normalizeContent(
            document.data() as FeedContentData
          )
        )
        .filter(content => content.published === true);
    } catch (error) {
      console.error('홈 추천 콘텐츠 조회 실패:', error);

      return [];
    }
  }

  /**
   * DM-27 사진 필드는 한 세트로 읽는다. 저장 데이터가 계약을 어겨도 출처 없는 사진이나
   * ATS가 막는 HTTP 사진이 카드 밴드로 들어가지 않도록, 유효하지 않은 세트는 통째로
   * 제거한다(CS-10).
   */
  private static normalizeContent(
    content: FeedContentData
  ): FeedContentData {
    const {
      imageUrl: _imageUrl,
      imageSource: _imageSource,
      imageLicense: _imageLicense,
      imageAttribution: _imageAttribution,
      imageContentId: _imageContentId,
      imageUpdatedAt: _imageUpdatedAt,
      ...contentWithoutImage
    } = content;
    const image = FeedContentStore.getValidImage(content);

    return {
      ...contentWithoutImage,
      ...(image ?? {}),
    };
  }

  private static getValidImage(
    content: FeedContentData
  ): Pick<
    FeedContentData,
    | 'imageUrl'
    | 'imageSource'
    | 'imageLicense'
    | 'imageAttribution'
    | 'imageContentId'
    | 'imageUpdatedAt'
  > | null {
    const imageUrl = FeedContentStore.getTrimmedString(content.imageUrl);

    if (!imageUrl || !imageUrl.startsWith('https://')) {
      return null;
    }

    if (content.imageLicense !== ImageLicense.KoglType1) {
      return null;
    }

    const imageSource = FeedContentStore.getTrimmedString(
      content.imageSource
    );
    const storedAttribution = FeedContentStore.getTrimmedString(
      content.imageAttribution
    );
    const imageAttribution =
      storedAttribution ??
      (imageSource
        ? `사진: ${imageSource} (공공누리 제1유형)`
        : null);

    if (!imageAttribution) {
      return null;
    }

    return {
      imageUrl,
      ...(imageSource ? { imageSource } : {}),
      imageLicense: ImageLicense.KoglType1,
      imageAttribution,
      ...FeedContentStore.getOptionalImageMetadata(content),
    };
  }

  private static getOptionalImageMetadata(
    content: FeedContentData
  ): Pick<FeedContentData, 'imageContentId' | 'imageUpdatedAt'> {
    const imageContentId = FeedContentStore.getTrimmedString(
      content.imageContentId
    );
    const imageUpdatedAt = FeedContentStore.getTrimmedString(
      content.imageUpdatedAt
    );

    return {
      ...(imageContentId ? { imageContentId } : {}),
      ...(imageUpdatedAt ? { imageUpdatedAt } : {}),
    };
  }

  private static getTrimmedString(value: string | undefined): string | null {
    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();

    return trimmed || null;
  }
}

export default FeedContentStore;
