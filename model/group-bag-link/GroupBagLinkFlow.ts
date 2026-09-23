import dayjs from 'dayjs';
import { makeAutoObservable, runInAction } from 'mobx';
import app from '@/model/app/App';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import Group from '@/model/group/Group';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import { GROUP_STORAGE_DATE_FORMAT } from '@/model/group-form/GroupStorageDate';
import { formatGroupDateRange } from '@/model/group-format/GroupFormat';
import GroupBagLinkDispatcher from './GroupBagLinkDispatcher';
import {
  BagScheduleChange,
  GroupBagLinkRequest,
  GroupBagLinkSubject,
} from './GroupBagLinkTypes';

/**
 * 배낭 ↔ 그룹 연결 흐름 (GRP-5 · BD-1).
 *
 * 그룹 상세(배낭 선택 시트)와 배낭 상세(`⋯` → 그룹에 연결)가 **이 한 곳**을 거친다.
 * 1. **한 배낭 = 한 그룹**: 이 배낭이 다른 그룹에 연결돼 있으면 옮길지 묻고, 옮기면 기존 연결을 해제한 뒤 연결한다.
 *    보안 규칙은 여러 문서를 가로질러 검사하지 못하므로 이 제약은 클라이언트가 지킨다.
 * 2. **일정 맞춤**: 연결한 뒤 배낭 기간(또는 등록 박지 여행지)이 그룹과 다르면 `그룹 일정으로 맞출까요?`를
 *    한 번 묻는다. 맞추지 않아도 연결은 이미 끝난 상태다.
 *
 * 연결을 먼저 하고 일정을 나중에 묻는 이유: 취소가 곧 "맞추지 않음"이 돼 알럿에 취소 콜백이 필요 없고,
 * 일정을 맞추면 그 뒤 스냅샷 동기화(`syncBagSnapshots`)가 맞춘 기간을 그룹에 다시 싣는다.
 */
class GroupBagLinkFlow {
  private busy = false;

  public static new() {
    return new GroupBagLinkFlow(GroupBagLinkDispatcher.new());
  }

  private constructor(private readonly dispatcher: GroupBagLinkDispatcher) {
    makeAutoObservable(this);
  }

  public isBusy(): boolean {
    return this.busy;
  }

  public async start(request: GroupBagLinkRequest): Promise<void> {
    if (this.busy) {
      return;
    }

    const others = await this.findOtherGroups(request);

    if (!others) {
      return;
    }

    if (others.length === 0) {
      await this.link(request, []);

      return;
    }

    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      message: l10n.t('group.link.moveConfirm', {
        from: others
          .map(group => group.getName())
          .join(l10n.t('group.link.nameSeparator')),
      }),
      confirmText: l10n.t('group.link.move'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        await this.link(request, others);
      },
    });
  }

  // 이 배낭이 물린 **다른** 그룹. 이 결정 이전의 배낭은 여럿일 수 있다 — 옮기면 전부 해제한다.
  private async findOtherGroups(
    request: GroupBagLinkRequest
  ): Promise<Group[] | null> {
    this.setBusy(true);

    try {
      const groups = await this.dispatcher.getGroupsByBag(
        request.subject.bagId
      );

      return groups.filter(group => group.getId() !== request.group.getId());
    } catch (error) {
      this.showError(error);

      return null;
    } finally {
      this.setBusy(false);
    }
  }

  private async link(request: GroupBagLinkRequest, others: Group[]) {
    // 옮기기 알럿은 확인 콜백이 도는 동안 열려 있다 — 확인을 두 번 눌러도 한 번만 옮긴다.
    if (this.busy) {
      return;
    }

    this.setBusy(true);

    let linked = false;

    try {
      linked = await this.moveAndLink(request, others);
    } finally {
      this.setBusy(false);
    }

    // 성공·실패와 무관하게 다시 읽는다 — 옮기기가 중간에 실패해도 화면이 실제 연결 상태를 그리게 한다.
    await this.notifyChanged(request);

    if (!linked) {
      return;
    }

    request.onLinked();
    await this.askSchedule(request);
  }

  /**
   * 기존 연결 해제 → 새 연결. 새 연결이 실패하면 **방금 해제한 연결을 되돌린다**(best effort) —
   * 그대로 두면 사용자는 옮기기를 취소당한 줄 모른 채 배낭이 어느 그룹에도 없는 상태가 된다.
   * 되돌리기까지 실패하면 그 상태가 남지만, 호출자가 화면을 다시 읽어 거짓 표시는 하지 않는다.
   */
  private async moveAndLink(
    request: GroupBagLinkRequest,
    others: Group[]
  ): Promise<boolean> {
    const bagId = request.subject.bagId;
    const unlinkedIds: string[] = [];

    try {
      for (const other of others) {
        if (await this.unlinkIfLinked(other.getId())) {
          unlinkedIds.push(other.getId());
        }
      }

      await this.dispatcher.linkBag(request.group.getId(), bagId);

      return true;
    } catch (error) {
      await this.restoreLinks(unlinkedIds, bagId);
      this.showError(error);

      return false;
    }
  }

  // 내보내졌거나 해산된 그룹의 역인덱스가 아직 남은 경우(DM-29 서버 정리 전) — 해제할 연결이 없다.
  private async unlinkIfLinked(groupId: string): Promise<boolean> {
    try {
      await this.dispatcher.unlinkBag(groupId);

      return true;
    } catch (error) {
      if (
        error instanceof GroupError &&
        (error.code === GroupValidationError.NotMember ||
          error.code === GroupValidationError.GroupNotFound)
      ) {
        return false;
      }

      throw error;
    }
  }

  private async restoreLinks(groupIds: string[], bagId: string) {
    for (const groupId of groupIds) {
      try {
        await this.dispatcher.linkBag(groupId, bagId);
      } catch (error) {
        console.warn('[GroupBagLinkFlow] restore link failed', groupId, error); // l10n-ignore: 개발자 로그
      }
    }
  }

  private async askSchedule(request: GroupBagLinkRequest) {
    const change = await this.buildScheduleChange(
      request.group,
      request.subject
    );

    if (!change) {
      return;
    }

    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      message: this.getScheduleMessage(request.group, change),
      confirmText: l10n.t('group.link.syncConfirm'),
      cancelText: l10n.t('group.link.syncSkip'),
      onConfirm: async () => {
        await this.applySchedule(request, change);
      },
    });
  }

  private async applySchedule(
    request: GroupBagLinkRequest,
    change: BagScheduleChange
  ) {
    if (this.busy) {
      return;
    }

    this.setBusy(true);

    try {
      await request.writer.applySchedule(change);
      app.getAnalyticsManager()?.logClick('bag_group_sync_schedule', {
        destination: change.location !== null,
      });
      await this.syncSnapshots(request.subject.bagId);
      app.getToastManager()?.showSimple(app.getL10n().t('group.link.synced'));
    } catch (error) {
      this.showError(error);
    } finally {
      this.setBusy(false);
    }

    await this.notifyChanged(request);
  }

  // 맞춘 기간·여행지를 이 배낭이 물린 그룹 스냅샷에 싣는다. 실패해도 다음 그룹 상세 진입 때 다시 쓴다(GRP-5 ③).
  private async syncSnapshots(bagId: string) {
    try {
      await this.dispatcher.syncBagSnapshots(bagId);
    } catch (error) {
      console.warn('[GroupBagLinkFlow] snapshot sync failed', error); // l10n-ignore: 개발자 로그
    }
  }

  private async buildScheduleChange(
    group: Group,
    subject: GroupBagLinkSubject
  ): Promise<BagScheduleChange | null> {
    const dates = this.getDateChange(group, subject);
    const location = await this.getLocationChange(group, subject);

    if (!dates && !location) {
      return null;
    }

    return { dates, location };
  }

  private getDateChange(
    group: Group,
    subject: GroupBagLinkSubject
  ): BagScheduleChange['dates'] {
    const groupStart = group.getStartDate();
    const groupEnd = group.getEndDate();

    if (!groupStart || !groupEnd) {
      return null;
    }

    const bagStart = subject.startDate?.format(GROUP_STORAGE_DATE_FORMAT);
    const bagEnd = subject.endDate?.format(GROUP_STORAGE_DATE_FORMAT);

    if (bagStart === groupStart && bagEnd === groupEnd) {
      return null;
    }

    // 그룹은 `YYYY-MM-DD`(DM-29), 배낭은 ISO 문자열(DM-5)이다 — 그 날짜의 로컬 자정으로 옮긴다.
    return {
      startDate: dayjs(groupStart).startOf('day').toISOString(),
      endDate: dayjs(groupEnd).startOf('day').toISOString(),
    };
  }

  /**
   * 그룹 여행지가 **등록 박지**이고 배낭 여행지가 그 박지가 아닐 때만 여행지를 맞춘다.
   * 좌표는 박지 문서의 공개 좌표다(자유 위치 그룹은 좌표를 저장하지 않는다, GRP-2).
   * 박지를 못 읽으면 여행지는 건드리지 않고 기간만 묻는다.
   */
  private async getLocationChange(
    group: Group,
    subject: GroupBagLinkSubject
  ): Promise<BagLocation | null> {
    const campSpotId = group.getCampSpotId();

    if (!campSpotId || subject.location?.campSpotId === campSpotId) {
      return null;
    }

    try {
      const spot = await this.dispatcher.getCampSpot(campSpotId);

      if (!spot) {
        return null;
      }

      // 박지 상세가 배낭 여행지에 박지를 넣을 때와 같은 모양이다(CS-5 → DST-5).
      return {
        name: spot.name,
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        campSpotId: spot.id,
      };
    } catch (error) {
      console.warn('[GroupBagLinkFlow] camp spot load failed', error); // l10n-ignore: 개발자 로그

      return null;
    }
  }

  private getScheduleMessage(group: Group, change: BagScheduleChange) {
    const l10n = app.getL10n();
    const range = formatGroupDateRange(group.getStartDate(), group.getEndDate());

    if (change.dates && change.location) {
      return l10n.t('group.link.syncDatesAndPlace', {
        range,
        place: change.location.name,
      });
    }

    if (change.location) {
      return l10n.t('group.link.syncPlace', { place: change.location.name });
    }

    return l10n.t('group.link.syncDates', { range });
  }

  private async notifyChanged(request: GroupBagLinkRequest) {
    try {
      await request.onChanged();
    } catch (error) {
      console.warn('[GroupBagLinkFlow] refresh failed', error); // l10n-ignore: 개발자 로그
    }
  }

  private showError(error: unknown) {
    app.getToastManager()?.showSimple(getGroupErrorMessage(error));
  }

  private setBusy(value: boolean) {
    runInAction(() => {
      this.busy = value;
    });
  }
}

export default GroupBagLinkFlow;
