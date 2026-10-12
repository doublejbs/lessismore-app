import { makeAutoObservable } from 'mobx';
import app from '@/model/app/App';
import type AlertManager from '@/model/alert/AlertManager';
import { openSubscription } from '@/model/subscription/OpenSubscription';
import SubscriptionEntryPoint from '@/model/subscription/SubscriptionEntryPoint';
import type ToastManager from '@/model/toast/ToastManager';
import type NetworkStatus from './NetworkStatus';
import { formatOfflineBytes, formatOfflineDate } from './OfflineFormat';
import OfflineSaveError from './OfflineSaveError';
import OfflineSaveErrorType from './OfflineSaveErrorType';
import OfflineTripStatus from './OfflineTripStatus';
import type OfflineTripStore from './OfflineTripStore';

/**
 * 배낭 상세 `오프라인` 타일의 도메인 객체 (OF-2 · OF-7 · SUB-11). 여행 한 건의 저장 상태·부제·탭 흐름을 맡는다.
 *
 * 탭 흐름:
 * - 오프라인 → 토스트 `온라인에서 저장할 수 있어요`.
 * - 권한 없음(미구독·만료) → 구독 화면(오프라인 진입점). 권한을 얻으면 `onEntitled`로 바로 저장(SUB-11).
 * - 미저장 + 권한 → 확인 없이 바로 저장(되돌릴 수 있는 동작이다).
 * - 저장됨 + 권한 → 바텀 메뉴(`지금 갱신` · `오프라인 저장 삭제`).
 */
class OfflineTrip {
  public static from(bagId: string) {
    return new OfflineTrip(
      bagId,
      app.getOfflineTripStore(),
      app.getNetworkStatus(),
      app.getToastManager(),
      app.getAlertManager()
    );
  }

  private menuVisible = false;

  private constructor(
    private readonly bagId: string,
    private readonly store: OfflineTripStore | null,
    private readonly networkStatus: NetworkStatus,
    private readonly toastManager: ToastManager | null,
    private readonly alertManager: AlertManager | null
  ) {
    makeAutoObservable<
      OfflineTrip,
      'store' | 'networkStatus' | 'toastManager' | 'alertManager'
    >(this, {
      store: false,
      networkStatus: false,
      toastManager: false,
      alertManager: false,
    });
  }

  // 웹·옛 바이너리에서는 타일을 그리지 않는다(OF-2 · §5).
  public isVisible(): boolean {
    return this.store?.isSupported() ?? false;
  }

  public getStatus(): OfflineTripStatus {
    const store = this.store;

    if (!store) {
      return OfflineTripStatus.Unsaved;
    }

    if (store.isSaving(this.bagId)) {
      // 상세 진입 자동 갱신은 `오프라인 갱신 중…`으로 — 사용자가 누르지 않은 "저장"이 시작된 것처럼 읽히지 않게(OF-2).
      return store.isAutoRefreshing(this.bagId)
        ? OfflineTripStatus.Refreshing
        : OfflineTripStatus.Saving;
    }

    if (!store.isSaved(this.bagId)) {
      return OfflineTripStatus.Unsaved;
    }

    if (!store.isEntitled()) {
      return OfflineTripStatus.Locked;
    }

    if (store.needsUpgrade(this.bagId)) {
      return OfflineTripStatus.NeedsUpgrade;
    }

    return OfflineTripStatus.Saved;
  }

  public isLocked(): boolean {
    return this.getStatus() === OfflineTripStatus.Locked;
  }

  public needsUpgrade(): boolean {
    return this.getStatus() === OfflineTripStatus.NeedsUpgrade;
  }

  public getBytes(): number {
    return this.store?.getEntry(this.bagId)?.bytes ?? 0;
  }

  public getSavedAt(): string | null {
    return this.store?.getEntry(this.bagId)?.savedAt ?? null;
  }

  // 타일 부제(OF-2 · OF-7). 미저장이면 구독 여부와 무관하게 `오프라인 저장`이다(유료 표시 배지 없음 — HM-8).
  public getSubtitle(): string {
    const l10n = app.getL10n();

    switch (this.getStatus()) {
      case OfflineTripStatus.Saving: {
        // 지도 팩을 받는 단계면 진행률을 보인다(OF-2 `지도 저장 중 · {n}%`).
        const percent = this.store?.getSavingProgress(this.bagId) ?? null;

        return percent === null
          ? l10n.t('offline.tile.saving')
          : l10n.t('offline.tile.savingMap', { percent });
      }
      case OfflineTripStatus.Refreshing: {
        const percent = this.store?.getSavingProgress(this.bagId) ?? null;

        return percent === null
          ? l10n.t('offline.tile.refreshing')
          : l10n.t('offline.tile.refreshingMap', { percent });
      }
      case OfflineTripStatus.Saved:
        return l10n.t('offline.tile.saved', {
          size: formatOfflineBytes(this.getBytes()),
          date: formatOfflineDate(this.getSavedAt() ?? ''),
        });
      case OfflineTripStatus.NeedsUpgrade:
        return l10n.t('offline.tile.needsUpgrade');
      case OfflineTripStatus.Locked:
        return l10n.t('offline.tile.locked');
      default:
        return l10n.t('offline.tile.unsaved');
    }
  }

  public isMenuVisible(): boolean {
    return this.menuVisible;
  }

  public closeMenu(): void {
    this.menuVisible = false;
  }

  public handlePress(): void {
    const store = this.store;

    if (!store) {
      return;
    }

    if (this.networkStatus.isOffline()) {
      this.toastManager?.showSimple(
        app.getL10n().t('offline.toast.onlineToSave')
      );

      return;
    }

    const status = this.getStatus();

    // 저장·자동 갱신이 도는 동안은 탭을 받지 않는다(같은 여행의 저장이 겹치지 않게).
    if (
      status === OfflineTripStatus.Saving ||
      status === OfflineTripStatus.Refreshing
    ) {
      return;
    }

    if (!store.isEntitled()) {
      // 구독 화면이 로그인부터 묻는다(SUB-3). 권한을 얻어 시트가 닫히면 이 여행을 바로 저장한다(SUB-11).
      // `onEntitled`는 권한을 얻은 뒤에만 불리므로, 권한 판단이 아직 따라오지 못했어도 저장을 시작한다.
      openSubscription(SubscriptionEntryPoint.Offline, {
        onEntitled: () => {
          app.getAnalyticsManager()?.logClick('offline_save', { source: 'tile' });
          void this.save(true);
        },
      });

      return;
    }

    if (status === OfflineTripStatus.Unsaved) {
      app.getAnalyticsManager()?.logClick('offline_save', { source: 'tile' });
      void this.save();

      return;
    }

    this.menuVisible = true;
  }

  // 바텀 메뉴 `지금 갱신`(OF-2). 실패하면 이전 저장본이 남고, 이때만 실패 토스트를 띄운다.
  public async refresh(): Promise<void> {
    app.getAnalyticsManager()?.logClick('offline_refresh');
    await this.save();
  }

  // 바텀 메뉴 `오프라인 저장 삭제`(OF-2) — 확인 알럿을 거친다.
  public confirmRemove(): void {
    const l10n = app.getL10n();

    this.alertManager?.show({
      message: l10n.t('offline.removeConfirm'),
      confirmText: l10n.t('common.delete'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        app.getAnalyticsManager()?.logClick('offline_remove');
        await this.store?.remove(this.bagId);
      },
    });
  }

  // 온라인 상세 진입마다 조용히 갱신한다(OF-2). 실패는 알리지 않는다.
  public refreshSilently(): void {
    void this.store?.refreshSilently(this.bagId);
  }

  // `entitledByPurchase`: 구독 화면에서 방금 권한을 얻어 부른 저장(SUB-11) — 권한 판단을 건너뛴다.
  private async save(entitledByPurchase = false): Promise<void> {
    try {
      await this.store?.save(this.bagId, { entitledByPurchase });
    } catch (error) {
      this.toastManager?.showSimple(
        OfflineTrip.getSaveErrorMessage(OfflineSaveError.typeOf(error))
      );
    }
  }

  private static getSaveErrorMessage(type: OfflineSaveErrorType): string {
    const l10n = app.getL10n();

    switch (type) {
      case OfflineSaveErrorType.LimitExceeded:
        return l10n.t('offline.toast.limit');
      case OfflineSaveErrorType.DiskFull:
        return l10n.t('offline.toast.diskFull');
      case OfflineSaveErrorType.Offline:
        return l10n.t('offline.toast.onlineToSave');
      default:
        return l10n.t('offline.toast.saveFailed');
    }
  }
}

export default OfflineTrip;
