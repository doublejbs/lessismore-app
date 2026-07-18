import { makeAutoObservable } from 'mobx';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';

// 박지 즐겨찾기 상태·CRUD (CampSite CS-9, DataModel DM-21).
// users/{uid}/camp-favorites/{spotId} — 문서 id == 박지 id라 토글이 멱등이다.
// 상세(토글)·지도(필터)가 이 싱글톤을 함께 읽어 어느 화면에서 토글해도 즉시 반영된다.
// store/ 계층은 보통 무상태 데이터 액세스지만, 즐겨찾기는 화면 간 공유하는 로컬 상태를
// observable로 들고 있어야 반응형 반영이 성립하므로 makeAutoObservable을 쓴다.
class CampFavoriteStore {
  // 즐겨찾기한 박지 id 집합. ObservableSet이라 has()/size가 observer에서 추적된다.
  private favoriteIds = new Set<string>();
  private loaded = false;

  public constructor(private readonly firebase: Firebase) {
    makeAutoObservable(this);
  }

  // 지도 탭 초기화 시 1회 로드(CS-9). 비로그인은 로드하지 않고 빈 상태를 유지한다.
  public async load(): Promise<void> {
    if (this.loaded) {
      return;
    }

    if (!this.firebase.isLoggedIn()) {
      return;
    }

    const snapshot = await getDocs(
      collection(
        this.getStore(),
        'users',
        this.firebase.getUserId(),
        'camp-favorites'
      )
    );
    const ids = snapshot.docs.map(favoriteDoc => favoriteDoc.id);

    this.setFavoriteIds(new Set(ids));
    this.setLoaded(true);
  }

  public isFavorite(spotId: string): boolean {
    return this.favoriteIds.has(spotId);
  }

  public hasFavorites(): boolean {
    return this.favoriteIds.size > 0;
  }

  // 낙관적 토글(CS-9): 로컬 상태를 먼저 갱신하고 Firestore에 반영한다.
  // 실패 시 로컬 상태를 되돌리고 예외를 다시 던진다(호출자가 토스트로 안내).
  public async toggle(spot: { id: string; name: string }): Promise<void> {
    const wasFavorite = this.favoriteIds.has(spot.id);

    this.applyLocal(spot.id, !wasFavorite);

    try {
      const favoriteRef = doc(
        this.getStore(),
        'users',
        this.firebase.getUserId(),
        'camp-favorites',
        spot.id
      );

      if (wasFavorite) {
        await deleteDoc(favoriteRef);
      } else {
        await setDoc(favoriteRef, {
          name: spot.name,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      this.applyLocal(spot.id, wasFavorite);

      throw e;
    }
  }

  // 로그아웃 시 다른 사용자의 즐겨찾기가 남지 않도록 초기화한다(Firebase.clear에서 호출).
  public reset() {
    this.setFavoriteIds(new Set());
    this.setLoaded(false);
  }

  private applyLocal(spotId: string, favorite: boolean) {
    if (favorite) {
      this.favoriteIds.add(spotId);
    } else {
      this.favoriteIds.delete(spotId);
    }
  }

  private setFavoriteIds(value: Set<string>) {
    this.favoriteIds = value;
  }

  private setLoaded(value: boolean) {
    this.loaded = value;
  }

  private getStore() {
    return this.firebase.getStore();
  }
}

export default CampFavoriteStore;
