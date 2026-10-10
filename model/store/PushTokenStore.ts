import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import Firebase from '../firebase/Firebase';
import PushTokenPlatform from '../notification/PushTokenPlatform';

// users/{uid}/push-tokens/{tokenId}에 쓰는 값(DM-34). 모르는 값(locale·appVersion)은 필드째 뺀다.
export type PushTokenRecord = {
  token: string;
  platform: PushTokenPlatform;
  briefingEnabled: boolean;
  locale?: string;
  appVersion?: string;
};

/**
 * 푸시 토큰 문서 쓰기·삭제(NT-12, DM-34 `users/{uid}/push-tokens/{tokenId}`).
 *
 * 문서는 본인만 읽고 쓴다(보안 규칙). uid는 호출자가 넘긴다 — 로그아웃 직전처럼 Firebase의
 * 로그인 상태가 곧 바뀌는 자리에서도 같은 uid로 지울 수 있게.
 */
class PushTokenStore {
  public constructor(private readonly firebase: Firebase) {}

  // 멱등 등록 — merge라 같은 기기가 몇 번 불러도 문서 1건이다.
  public async save(
    userId: string,
    tokenId: string,
    record: PushTokenRecord
  ): Promise<void> {
    await setDoc(
      this.tokenRef(userId, tokenId),
      { ...record, updatedAt: serverTimestamp() },
      { merge: true }
    );
  }

  public async remove(userId: string, tokenId: string): Promise<void> {
    await deleteDoc(this.tokenRef(userId, tokenId));
  }

  private tokenRef(userId: string, tokenId: string) {
    return doc(
      this.firebase.getStore(),
      'users',
      userId,
      'push-tokens',
      tokenId
    );
  }
}

export default PushTokenStore;
