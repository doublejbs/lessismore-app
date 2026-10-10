import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import Firebase from '@/model/firebase/Firebase';
import type Gear from '@/model/gear/Gear';
import BagStore from '@/model/store/BagStore';
import CommunityStore from '@/model/store/CommunityStore';

/**
 * 여행 기록(CM-16)의 데이터 접근을 위임한다 — 내 배낭 1건 읽기와 배낭당 기록 1개 확인.
 * 배낭 상세(BD-10)·알림 탭(NT-3)도 기록 여부 확인에 이 클래스를 쓴다.
 */
class TripRecordDispatcher {
  public static new(): TripRecordDispatcher {
    return new TripRecordDispatcher(
      app.getBagStore()!,
      app.getCommunityStore()!,
      app.getFirebase()
    );
  }

  private constructor(
    private readonly bagStore: BagStore,
    private readonly communityStore: CommunityStore,
    private readonly firebase: Firebase
  ) {}

  // 소유하지 않은 배낭이면 null이다(알럿 없이).
  public async getOwnedBag(
    bagId: string
  ): Promise<{ bag: BagItem; gears: Gear[] } | null> {
    return await this.bagStore.getOwnedBagWithGears(bagId);
  }

  // 이 배낭의 내 기록 id. 비로그인이면 null.
  public async findMyRecordId(bagId: string): Promise<string | null> {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return null;
    }

    return await this.communityStore.findMyTripRecordId(userId, bagId);
  }
}

export default TripRecordDispatcher;
