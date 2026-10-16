import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { makeAutoObservable, reaction } from 'mobx';
import Firebase from '../firebase/Firebase';
import BlockedUser from '../block/BlockedUser';
import BlockSurface from '../block/BlockSurface';
import { toDate } from '../community/CommunityData';
import CommunityReportReason from '../community/CommunityReportReason';
import CommunityReportTargetType from '../community/CommunityReportTargetType';
import CommunityStore from './CommunityStore';

export interface BlockUserInput {
  uid: string;
  name: string;
  surface: BlockSurface;
  // 차단한 자리 — 게시글·장비·박지 id와 댓글 id(박지 후기는 작성자 uid). 운영자 알림 신고에 남긴다.
  postId?: string;
  commentId?: string;
}

const BLOCKED_USERS_COLLECTION = 'blocked-users';

/**
 * 사용자 차단(CM-17, DM-38).
 *
 * 차단 목록을 메모리에 들고 있고, UGC 목록(커뮤니티 피드·검색·상세 댓글, 장비 댓글, 박지 후기)이
 * 이 목록으로 작성자 uid를 **클라이언트 필터**한다 — 목록이 observable이라 차단하는 순간
 * 다시 조회하지 않아도 화면에서 빠진다.
 *
 * 로그인 uid를 따라간다 — 로그인하면(앱 시작 시 이미 로그인 상태 포함) 한 번 읽고, 로그아웃하면 비운다.
 * 읽기 실패는 조용히 넘긴다(필터 없이 보인다).
 */
class BlockedUserStore {
  public static new(firebase: Firebase, communityStore: CommunityStore) {
    return new BlockedUserStore(firebase, communityStore);
  }

  private users: BlockedUser[] = [];
  private loading = false;
  private loaded = false;

  private constructor(
    private readonly firebase: Firebase,
    private readonly communityStore: CommunityStore
  ) {
    makeAutoObservable(this);
  }

  public initialize() {
    reaction(
      () => this.firebase.getUserId(),
      userId => {
        void this.handleUserChanged(userId);
      },
      { fireImmediately: true }
    );
  }

  public async load() {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return;
    }

    this.setLoading(true);

    try {
      const snapshot = await getDocs(
        collection(
          this.firebase.getStore(),
          'users',
          userId,
          BLOCKED_USERS_COLLECTION
        )
      );

      // 읽는 사이 계정이 바뀌었으면 옛 계정 목록을 쓰지 않는다.
      if (this.firebase.getUserId() !== userId) {
        return;
      }

      const users = snapshot.docs.map(blockedDoc => {
        const data = blockedDoc.data();

        return {
          uid: blockedDoc.id,
          name: typeof data.blockedUserName === 'string' ? data.blockedUserName : '',
          createdAt: data.createdAt ? toDate(data.createdAt) : null,
        };
      });

      this.setUsers(this.sortByNewest(users));
      this.setLoaded(true);
    } catch (error) {
      console.warn('차단 목록 조회 실패:', error); // l10n-ignore: 개발자 로그
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * 차단 문서를 저장하고 메모리 목록에 바로 넣는다. 운영자 알림 신고(`user`/`blocked`)는
   * 그다음 best-effort로 만든다 — 신고가 실패해도 차단은 되돌리지 않는다(CM-17).
   */
  public async block(input: BlockUserInput) {
    const userId = this.firebase.getUserId();

    if (!userId || !input.uid || input.uid === userId) {
      throw new Error('block target invalid');
    }

    await setDoc(
      doc(
        this.firebase.getStore(),
        'users',
        userId,
        BLOCKED_USERS_COLLECTION,
        input.uid
      ),
      {
        blockedUserName: input.name,
        surface: input.surface,
        createdAt: serverTimestamp(),
      }
    );

    this.setUsers([
      { uid: input.uid, name: input.name, createdAt: new Date() },
      ...this.users.filter(user => user.uid !== input.uid),
    ]);

    void this.notifyOperator(input);
  }

  public async unblock(uid: string) {
    const userId = this.firebase.getUserId();

    if (!userId) {
      return;
    }

    await deleteDoc(
      doc(this.firebase.getStore(), 'users', userId, BLOCKED_USERS_COLLECTION, uid)
    );

    this.setUsers(this.users.filter(user => user.uid !== uid));
  }

  public isBlocked(uid: string | undefined) {
    if (!uid) {
      return false;
    }

    return this.blockedIds.has(uid);
  }

  // 작성자가 차단된 항목을 뺀다. 차단 목록이 비어 있으면 같은 배열을 그대로 돌려준다.
  public filterVisible<T>(
    items: readonly T[],
    getAuthorId: (item: T) => string | undefined
  ): T[] {
    if (this.blockedIds.size === 0) {
      return items as T[];
    }

    return items.filter(item => !this.isBlocked(getAuthorId(item)));
  }

  public getUsers() {
    return this.users;
  }

  public isLoading() {
    return this.loading;
  }

  public isLoaded() {
    return this.loaded;
  }

  private get blockedIds() {
    return new Set(this.users.map(user => user.uid));
  }

  private async handleUserChanged(userId: string) {
    this.setUsers([]);
    this.setLoaded(false);

    if (!userId) {
      return;
    }

    await this.load();
  }

  private async notifyOperator(input: BlockUserInput) {
    try {
      await this.communityStore.report({
        targetType: CommunityReportTargetType.User,
        postId: input.postId ?? '',
        targetAuthorId: input.uid,
        reason: CommunityReportReason.Blocked,
        ...(input.commentId ? { commentId: input.commentId } : {}),
      });
    } catch (error) {
      console.warn('차단 운영자 알림 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  private sortByNewest(users: BlockedUser[]) {
    return [...users].sort(
      (left, right) =>
        (right.createdAt?.getTime() ?? 0) - (left.createdAt?.getTime() ?? 0)
    );
  }

  private setUsers(value: BlockedUser[]) {
    this.users = value;
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setLoaded(value: boolean) {
    this.loaded = value;
  }
}

export default BlockedUserStore;
