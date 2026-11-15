import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import BlockedUser from '@/model/block/BlockedUser';
import BlockedUserStore from '@/model/store/BlockedUserStore';

/**
 * 차단한 사용자 관리 화면(CM-17 해제, AU-4 `차단한 사용자` 행).
 *
 * 목록은 `BlockedUserStore`의 메모리 목록을 그대로 보여 준다 — 화면을 열 때 한 번 다시 읽어 다른
 * 기기에서 바꾼 차단도 반영한다. 해제하면 문서를 지우고 목록에서 바로 빠진다.
 */
class BlockedUsers {
  public static from(store: BlockedUserStore) {
    return new BlockedUsers(store);
  }

  private unblockingUids: string[] = [];

  private constructor(private readonly store: BlockedUserStore) {
    makeAutoObservable(this);
  }

  public async initialize() {
    await this.store.load();
  }

  public getUsers() {
    return this.store.getUsers();
  }

  // 처음 읽는 중에만 로딩으로 본다 — 이미 들고 있는 목록이 있으면 바로 그린다.
  public isLoading() {
    return this.store.isLoading() && !this.store.isLoaded();
  }

  public isLoggedIn() {
    return app.getFirebase().isLoggedIn();
  }

  public isUnblocking(uid: string) {
    return this.unblockingUids.includes(uid);
  }

  public async unblock(user: BlockedUser) {
    if (this.isUnblocking(user.uid)) {
      return;
    }

    const l10n = app.getL10n();

    this.setUnblockingUids([...this.unblockingUids, user.uid]);

    try {
      await this.store.unblock(user.uid);
      app.getAnalyticsManager()?.logEvent('unblock_user');
      app.getToastManager()?.show({ message: l10n.t('moderation.blockedUsers.unblocked') });
    } catch {
      app.getToastManager()?.show({ message: l10n.t('moderation.blockedUsers.unblockFailed') });
    } finally {
      this.setUnblockingUids(this.unblockingUids.filter(uid => uid !== user.uid));
    }
  }

  private setUnblockingUids(value: string[]) {
    this.unblockingUids = value;
  }
}

export default BlockedUsers;
