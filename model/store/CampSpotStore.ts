import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import { CampSpot, CampSpotData } from '../camp-site/CampSpotTypes';
import { ReviewCache } from '../review/ReviewTypes';

// 박지 카탈로그 조회 (CampSite CS-1, DataModel DM-17).
// /camp-spot 은 관리 스크립트로만 적재되며 클라이언트는 읽기 전용이다.
class CampSpotStore {
  public constructor(private readonly firebase: Firebase) {}

  // status === 'active' 문서를 전량 조회한다. 에러는 호출측에서 처리하도록 그대로 throw 한다.
  public async getActiveSpots(): Promise<CampSpot[]> {
    const snapshot = await getDocs(
      query(
        collection(this.getStore(), 'camp-spot'),
        where('status', '==', 'active')
      )
    );

    return snapshot.docs.map(doc => ({
      ...(doc.data() as CampSpotData),
      id: doc.id,
    }));
  }

  // 단건 조회 (CampSite CS-3). 문서가 없으면 null 을 반환한다.
  public async getSpot(id: string): Promise<CampSpot | null> {
    const snapshot = await getDoc(doc(this.getStore(), 'camp-spot', id));

    if (!snapshot.exists()) {
      return null;
    }

    return {
      ...(snapshot.data() as CampSpotData),
      id: snapshot.id,
    };
  }

  // 박지 후기 공유 캐시 조회 (CampSite CS-3, DataModel DM-18). 문서가 없으면 null.
  public async getReviewCache(
    spotId: string
  ): Promise<ReviewCache | null> {
    const snapshot = await getDoc(
      doc(this.getStore(), 'camp-spot-review', spotId)
    );

    if (!snapshot.exists()) {
      return null;
    }

    return snapshot.data() as ReviewCache;
  }

  // 박지 후기 공유 캐시 갱신 (DM-18). 문서 통째 덮어쓰기 — 두 소스 모두
  // 조회에 성공한 결과만 저장해야 한다(실패로 캐시를 오염시키지 않기, 호출측 책임).
  public async saveReviewCache(
    spotId: string,
    cache: ReviewCache
  ): Promise<void> {
    await setDoc(doc(this.getStore(), 'camp-spot-review', spotId), cache);
  }

  private getStore() {
    return this.firebase.getStore();
  }
}

export default CampSpotStore;
