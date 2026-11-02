import { makeAutoObservable } from 'mobx';
import dayjs from 'dayjs';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import BagItem from '@/model/bag/BagItem';
import { GroupCreateInput } from '@/model/group/GroupData';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import GroupFieldErrors from '@/model/group-form/GroupFieldErrors';
import { GROUP_STORAGE_DATE_FORMAT } from '@/model/group-form/GroupStorageDate';
import { GROUP_NAME_MAX_LENGTH } from '@/model/group/GroupLimits';
import GroupCreateDispatcher from './GroupCreateDispatcher';
import GroupCreateEntryPoint from './GroupCreateEntryPoint';
import GroupCreateField from './GroupCreateField';

// 실패 코드가 가리키는 폼 필드. 여기 없는 코드는 필드가 아니라 화면 전체의 실패다.
const FIELD_BY_CODE: Partial<Record<GroupValidationError, GroupCreateField>> = {
  [GroupValidationError.NameLength]: GroupCreateField.Name,
  [GroupValidationError.DateRange]: GroupCreateField.Date,
  [GroupValidationError.DateTooLong]: GroupCreateField.Date,
};

/**
 * 그룹 만들기 도메인 모델 (GRP-2).
 *
 * 여행지는 공용 선택기가 좌표까지 실어 주지만 **좌표는 그룹에 저장하지 않는다**(GRP-2/GRP-5
 * 공개 원칙). 좌표를 들고 있는 이유는 선택기를 다시 열 때 현재 위치를 되돌려주기 위해서일 뿐이고,
 * `toInput()`은 `campSpotId`와 표시 이름만 내보낸다.
 *
 * 배낭 상세에서 들어오면(`bagId`, GRP-13) 그 배낭 값으로 폼을 미리 채우고, 만들기에 성공하면
 * 그 배낭을 새 그룹에 자동으로 연결한다. 본인 배낭이 아니거나 읽기에 실패하면 빈 폼 그대로다.
 */
class GroupCreate {
  public static from(
    dispatcher: GroupCreateDispatcher,
    bagId: string | null = null
  ): GroupCreate {
    return new GroupCreate(dispatcher, bagId);
  }

  private name = '';
  private startDate: dayjs.Dayjs = dayjs().startOf('day');
  private endDate: dayjs.Dayjs | null = dayjs().add(1, 'day').startOf('day');
  private destination: BagLocation | null = null;
  private submitting = false;
  private dirty = false;
  // GRP-13: 배낭 값을 읽는 중인지. 다 읽은 뒤에 폼을 그려 기본값이 바뀌며 튀지 않게 한다.
  private prefilling = false;
  // 미리 채우기는 한 번만 돈다 — 다시 불려도 같은 Promise를 돌려준다.
  private prefillTask: Promise<void> | null = null;
  // 본인 배낭으로 확인돼 미리 채운 배낭. 이 값이 있을 때만 자동 연결한다.
  private prefilledBagId: string | null = null;
  private bagLinkFailed = false;
  // 필드 오류 배선은 수정 화면과 같은 공용 모델을 쓴다.
  private readonly fieldErrors =
    GroupFieldErrors.from<GroupCreateField>(FIELD_BY_CODE);

  private constructor(
    private readonly dispatcher: GroupCreateDispatcher,
    private readonly bagId: string | null
  ) {
    // 첫 렌더부터 로딩으로 둔다 — 기본값 폼이 잠깐 보였다가 배낭 값으로 바뀌지 않게.
    this.prefilling = bagId !== null;
    makeAutoObservable<GroupCreate, 'prefillTask'>(this, { prefillTask: false });
  }

  // `click_group_create`의 `from`(GRP-13). 배낭을 못 읽었어도 들어온 경로는 배낭 상세다.
  public getEntryPoint(): GroupCreateEntryPoint {
    if (this.bagId) {
      return GroupCreateEntryPoint.BagDetail;
    }

    return GroupCreateEntryPoint.GroupList;
  }

  public getIsPrefilling() {
    return this.prefilling;
  }

  // 자동 연결(GRP-13)이 실패했는지. 그룹은 남아 있고, 화면이 토스트로 알린다.
  public hasBagLinkFailed() {
    return this.bagLinkFailed;
  }

  /**
   * 배낭 값으로 폼을 미리 채운다 (GRP-13). 사용자가 고친 값이 아니므로 `dirty`를 세우지 않는다 —
   * 손대지 않고 나가면 이탈 확인 알럿이 뜨지 않는다. 실패하면 조용히 빈 폼으로 둔다.
   */
  public prefill(): Promise<void> {
    if (!this.prefillTask) {
      this.prefillTask = this.loadPrefill();
    }

    return this.prefillTask;
  }

  private async loadPrefill(): Promise<void> {
    if (!this.bagId) {
      return;
    }

    try {
      const bag = await this.dispatcher.getOwnedBag(this.bagId);

      if (bag) {
        this.applyBag(bag);
      }
    } catch (error) {
      console.warn('[GroupCreate] 배낭 미리 채우기 실패', error); // l10n-ignore: 개발자 로그
    } finally {
      this.setPrefilling(false);
    }
  }

  // 이름 2자 미만·기간 30일 초과는 채운 채로 두고 제출 검증이 막는다(GRP-13).
  private applyBag(bag: BagItem) {
    const start = bag.getTripStart();
    const end = bag.getTripEnd() ?? start;

    this.name = bag.getName().trim().slice(0, GROUP_NAME_MAX_LENGTH);

    if (start && end) {
      this.startDate = start.startOf('day');
      this.endDate = end.startOf('day');
    }

    // 좌표는 화면 상태로만 든다 — `toInput()`이 박지 ID와 표시 이름만 내보낸다.
    this.destination = bag.getLocation();
    this.prefilledBagId = bag.getID();
  }

  private setPrefilling(value: boolean) {
    this.prefilling = value;
  }

  public getName() {
    return this.name;
  }

  public setName(name: string) {
    this.name = name;
    this.dirty = true;
    this.fieldErrors.clearField(GroupCreateField.Name);
  }

  public getStartDate() {
    return this.startDate;
  }

  public setStartDate(date: dayjs.Dayjs) {
    this.startDate = date;
    this.dirty = true;
    this.fieldErrors.clearField(GroupCreateField.Date);
  }

  public getEndDate() {
    return this.endDate;
  }

  public setEndDate(date: dayjs.Dayjs | null) {
    this.endDate = date;
    this.dirty = true;
    this.fieldErrors.clearField(GroupCreateField.Date);
  }

  // 선택기를 다시 열 때 넘길 현재 여행지. 저장 대상이 아니라 화면 상태다.
  public getDestination(): BagLocation | null {
    return this.destination;
  }

  public setDestination(location: BagLocation) {
    this.destination = location;
    this.dirty = true;
  }

  public clearDestination() {
    this.destination = null;
    this.dirty = true;
  }

  public getDestinationName(): string {
    return this.destination?.name ?? '';
  }

  public hasDestination() {
    return this.destination !== null;
  }

  public getIsSubmitting() {
    return this.submitting;
  }

  public getIsDirty() {
    return this.dirty;
  }

  public getFieldError(field: GroupCreateField): GroupValidationError | null {
    return this.fieldErrors.get(field);
  }

  public getFirstErrorField(): GroupCreateField | null {
    return this.fieldErrors.getFirstField();
  }

  /**
   * 그룹을 만들고 새 그룹 ID를 돌려준다.
   * 실패는 `GroupError`로 올라가며, 폼 필드가 가리켜지는 코드는 필드 오류로도 남긴다 —
   * 화면은 해당 필드로 스크롤하고 필드 아래 문구를 띄운다(GRP-2).
   */
  public async submit(): Promise<string> {
    this.setSubmitting(true);
    this.fieldErrors.clear();

    try {
      const groupId = await this.dispatcher.createGroup(this.toInput());

      // 만들기가 끝나면 지킬 내용이 없다 — 이탈 확인 알럿이 떠 이동을 막지 않게 푼다.
      this.setDirty(false);
      // 자동 연결은 일부러 submit 안에서 기다린다 — 만들기 진행 표시가 연결까지 덮는다(GRP-13).
      await this.linkPrefilledBag(groupId);

      return groupId;
    } catch (error) {
      this.fieldErrors.capture(error);

      throw error;
    } finally {
      this.setSubmitting(false);
    }
  }

  /**
   * 미리 채운 배낭을 새 그룹에 연결한다 (GRP-13). GRP-5와 같은 쓰기·스냅샷이지만 일정 맞춤·옮기기·교체
   * 확인은 띄우지 않는다 — 새 그룹에는 다른 배낭이 없고, 일정은 이미 배낭에서 왔다.
   * 이 배낭이 이미 다른 그룹에 물려 있으면 한 배낭 = 한 그룹 제약을 깨지 않게 연결하지 않는다(실패로 표시).
   * 실패해도 그룹은 남긴다 — throw하지 않고 표시만 남긴다.
   */
  private async linkPrefilledBag(groupId: string) {
    const bagId = this.prefilledBagId;

    if (!bagId) {
      return;
    }

    try {
      const linkedGroups = await this.dispatcher.getGroupsByBag(bagId);

      // 이미 다른 그룹에 물려 있으면 연결하지 않고 실패로 알린다 — 배낭 ⋯에서 옮기게 한다.
      if (linkedGroups.length > 0) {
        this.setBagLinkFailed(true);

        return;
      }

      await this.dispatcher.linkBag(groupId, bagId);
    } catch (error) {
      console.warn('[GroupCreate] 배낭 자동 연결 실패', error); // l10n-ignore: 개발자 로그
      this.setBagLinkFailed(true);
    }
  }

  private setDirty(value: boolean) {
    this.dirty = value;
  }

  private setBagLinkFailed(value: boolean) {
    this.bagLinkFailed = value;
  }

  private toInput(): GroupCreateInput {
    // 범위 선택기는 시작일만 고른 중간 상태를 허용한다 — 그때 종료일은 비어 있다.
    if (!this.endDate) {
      throw new GroupError(GroupValidationError.DateRange);
    }

    const input: GroupCreateInput = {
      name: this.name.trim(),
      startDate: this.startDate.format(GROUP_STORAGE_DATE_FORMAT),
      endDate: this.endDate.format(GROUP_STORAGE_DATE_FORMAT),
    };
    const campSpotId = this.destination?.campSpotId;
    const destinationName = this.destination?.name.trim();

    if (campSpotId) {
      input.campSpotId = campSpotId;
    }

    if (destinationName) {
      input.destinationName = destinationName;
    }

    return input;
  }

  private setSubmitting(submitting: boolean) {
    this.submitting = submitting;
  }
}

export default GroupCreate;
