import type { DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import app from '@/model/app/App';
import CommunityFeedFilter from '@/model/community/CommunityFeedFilter';
import CommunityFeedSort from '@/model/community/CommunityFeedSort';
import CommunityPost from '@/model/community/CommunityPost';
import CommunityStore from '@/model/store/CommunityStore';

interface CommunityFeedPage {
  posts: CommunityPost[];
  cursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

class CommunityFeedDispatcher {
  public static new() {
    return new CommunityFeedDispatcher(app.getCommunityStore()!);
  }

  private constructor(private readonly store: CommunityStore) {}

  public async getPage(
    filter: CommunityFeedFilter,
    sort: CommunityFeedSort,
    cursor: QueryDocumentSnapshot<DocumentData> | null,
    spotId: string | null = null
  ): Promise<CommunityFeedPage> {
    // 박지 필터(CS-11)는 그 박지의 여행 기록만 최신순으로 읽는다 — 인덱스 ②가 최신순 하나뿐이라
    // 정렬 선택(인기순)은 이 조회에 적용하지 않는다.
    if (spotId) {
      return await this.store.getSpotTripRecordsPage(spotId, cursor);
    }

    return await this.store.getFeedPage(filter, sort, cursor);
  }
}

export default CommunityFeedDispatcher;
