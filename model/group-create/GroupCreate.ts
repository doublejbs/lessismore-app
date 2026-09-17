import { makeAutoObservable } from 'mobx';
import dayjs from 'dayjs';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { GroupCreateInput } from '@/model/group/GroupData';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import GroupFieldErrors from '@/model/group-form/GroupFieldErrors';
import { GROUP_STORAGE_DATE_FORMAT } from '@/model/group-form/GroupStorageDate';
import GroupCreateDispatcher from './GroupCreateDispatcher';
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
 */
class GroupCreate {
  public static from(dispatcher: GroupCreateDispatcher): GroupCreate {
    return new GroupCreate(dispatcher);
  }

  private name = '';
  private startDate: dayjs.Dayjs = dayjs().startOf('day');
  private endDate: dayjs.Dayjs | null = dayjs().add(1, 'day').startOf('day');
  private destination: BagLocation | null = null;
  private submitting = false;
  private dirty = false;
  // 필드 오류 배선은 수정 화면과 같은 공용 모델을 쓴다.
  private readonly fieldErrors =
    GroupFieldErrors.from<GroupCreateField>(FIELD_BY_CODE);

  private constructor(private readonly dispatcher: GroupCreateDispatcher) {
    makeAutoObservable(this);
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
      this.dirty = false;

      return groupId;
    } catch (error) {
      this.fieldErrors.capture(error);

      throw error;
    } finally {
      this.setSubmitting(false);
    }
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
