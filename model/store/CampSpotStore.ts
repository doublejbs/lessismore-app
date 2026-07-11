import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import { CampSpot, CampSpotData } from '../camp-site/CampSpotTypes';

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

  private getStore() {
    return this.firebase.getStore();
  }
}

export default CampSpotStore;
