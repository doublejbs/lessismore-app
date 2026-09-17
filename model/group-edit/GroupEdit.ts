import dayjs from 'dayjs';
import { makeAutoObservable, runInAction } from 'mobx';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { GroupPatch } from '@/model/group/GroupData';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import GroupFieldErrors from '@/model/group-form/GroupFieldErrors';
import { GROUP_STORAGE_DATE_FORMAT } from '@/model/group-form/GroupStorageDate';
import GroupEditDispatcher from './GroupEditDispatcher';
import GroupEditField from './GroupEditField';

const FIELD_BY_CODE: Partial<Record<GroupValidationError, GroupEditField>> = {
  [GroupValidationError.NameLength]: GroupEditField.Name,
  [GroupValidationError.DateRange]: GroupEditField.Date,
  [GroupValidationError.DateTooLong]: GroupEditField.Date,
  [GroupValidationError.MeetingNoteLength]: GroupEditField.MeetingNote,
};

/**
 * 그룹 정보 수정 도메인 모델 (GRP-7). **방장만** 쓴다.
 *
 * 여행지 좌표는 그룹에 저장하지 않는다(GRP-2 공개 원칙) — 선택기를 다시 열 때 쓰려고
 * 들고만 있고, 저장은 `campSpotId`와 표시 이름뿐이다. 등록 박지라면 좌표를 박지 문서에서
 * 다시 읽어 채운다(자유 위치는 되돌릴 좌표가 없어 선택기가 미설정 상태로 열린다).
 */
class GroupEdit {
  public static from(dispatcher: GroupEditDispatcher, groupId: string) {
    return new GroupEdit(dispatcher, groupId);
  }

  private name = '';
  private startDate: dayjs.Dayjs = dayjs().startOf('day');
  private endDate: dayjs.Dayjs | null = null;
  private meetingNote = '';
  private destination: BagLocation | null = null;
  private destinationName = '';
  private campSpotId: string | undefined = undefined;
  private destinationDirty = false;
  private loading = false;
  private initialized = false;
  private submitting = false;
  private dirty = false;
  private error: Error | null = null;
  private notFound = false;
  private notOwner = false;
  // 필드 오류 배선은 만들기 화면과 같은 공용 모델을 쓴다.
  private readonly fieldErrors =
    GroupFieldErrors.from<GroupEditField>(FIELD_BY_CODE);

  private constructor(
    private readonly dispatcher: GroupEditDispatcher,
    private readonly groupId: string
  ) {
    makeAutoObservable(this);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.setLoading(true);
    this.setError(null);

    try {
      const group = await this.dispatcher.getGroup(this.groupId);

      if (!group) {
        runInAction(() => {
          this.notFound = true;
        });

        return;
      }

      if (!group.isOwner(this.dispatcher.getUserId())) {
        runInAction(() => {
          this.notOwner = true;
        });

        return;
      }

      const endDate = group.getEndDate();

      runInAction(() => {
        this.name = group.getName();
        this.startDate = dayjs(group.getStartDate()).startOf('day');
        this.endDate = endDate ? dayjs(endDate).startOf('day') : null;
        this.meetingNote = group.getMeetingNote() ?? '';
        this.destinationName = group.getDestinationName() ?? '';
        this.campSpotId = group.getCampSpotId();
      });

      await this.loadCampSpot();
    } catch (error) {
      this.setError(error as Error);
    } finally {
      runInAction(() => {
        this.loading = false;
        this.initialized = true;
      });
    }
  }

  public getName() {
    return this.name;
  }

  public setName(name: string) {
    this.name = name;
    this.dirty = true;
    this.fieldErrors.clearField(GroupEditField.Name);
  }

  public getStartDate() {
    return this.startDate;
  }

  public setStartDate(date: dayjs.Dayjs) {
    this.startDate = date;
    this.dirty = true;
    this.fieldErrors.clearField(GroupEditField.Date);
  }

  public getEndDate() {
    return this.endDate;
  }

  public setEndDate(date: dayjs.Dayjs | null) {
    this.endDate = date;
    this.dirty = true;
    this.fieldErrors.clearField(GroupEditField.Date);
  }

  public getMeetingNote() {
    return this.meetingNote;
  }

  public setMeetingNote(value: string) {
    this.meetingNote = value;
    this.dirty = true;
    this.fieldErrors.clearField(GroupEditField.MeetingNote);
  }

  // 선택기를 다시 열 때 넘길 현재 여행지. 좌표를 모르는 자유 위치는 null이다.
  public getDestination(): BagLocation | null {
    return this.destination;
  }

  public getDestinationName(): string {
    return this.destinationName;
  }

  public setDestination(location: BagLocation) {
    this.destination = location;
    this.destinationName = location.name;
    this.campSpotId = location.campSpotId;
    this.destinationDirty = true;
    this.dirty = true;
  }

  public clearDestination() {
    this.destination = null;
    this.destinationName = '';
    this.campSpotId = undefined;
    this.destinationDirty = true;
    this.dirty = true;
  }

  public getIsLoading() {
    return this.loading;
  }

  public getIsInitialized() {
    return this.initialized;
  }

  public getIsSubmitting() {
    return this.submitting;
  }

  public getIsDirty() {
    return this.dirty;
  }

  public getError() {
    return this.error;
  }

  public isNotFound() {
    return this.notFound;
  }

  public isNotOwner() {
    return this.notOwner;
  }

  public getFieldError(field: GroupEditField): GroupValidationError | null {
    return this.fieldErrors.get(field);
  }

  public getFirstErrorField(): GroupEditField | null {
    return this.fieldErrors.getFirstField();
  }

  /**
   * 변경분을 저장한다 (GRP-7).
   * 멤버 전원의 역인덱스 갱신은 서버 몫이라 본인 것만 최신이 된다 — 화면은 이를 문제 삼지 않는다.
   */
  public async submit(): Promise<void> {
    this.setSubmitting(true);
    this.fieldErrors.clear();

    try {
      await this.dispatcher.updateGroup(this.groupId, this.toPatch());

      runInAction(() => {
        this.dirty = false;
        this.destinationDirty = false;
      });
    } catch (error) {
      this.fieldErrors.capture(error);

      throw error;
    } finally {
      this.setSubmitting(false);
    }
  }

  private toPatch(): GroupPatch {
    // 범위 선택기는 시작일만 고른 중간 상태를 허용한다 — 그때 종료일은 비어 있다.
    if (!this.endDate) {
      throw new GroupError(GroupValidationError.DateRange);
    }

    const patch: GroupPatch = {
      name: this.name.trim(),
      startDate: this.startDate.format(GROUP_STORAGE_DATE_FORMAT),
      endDate: this.endDate.format(GROUP_STORAGE_DATE_FORMAT),
      meetingNote: this.meetingNote.trim() || null,
    };

    // 손대지 않은 여행지는 patch에 싣지 않는다 — 빈 값으로 덮어써 연결이 끊기지 않게 한다.
    if (this.destinationDirty) {
      patch.campSpotId = this.campSpotId ?? null;
      patch.destinationName = this.destinationName.trim() || null;
    }

    return patch;
  }

  private async loadCampSpot() {
    const campSpotId = this.campSpotId;

    if (!campSpotId) {
      return;
    }

    try {
      const spot = await this.dispatcher.getCampSpot(campSpotId);

      if (!spot) {
        return;
      }

      runInAction(() => {
        this.destination = {
          name: spot.name,
          latitude: spot.location.latitude,
          longitude: spot.location.longitude,
          campSpotId,
        };
        this.destinationName = spot.name;
      });
    } catch (error) {
      // 좌표를 못 읽어도 이름은 그대로 보인다 — 선택기가 미설정으로 열릴 뿐이다.
      console.warn('그룹 여행지 박지 조회 실패:', error); // l10n-ignore: 개발자 로그
    }
  }

  private setLoading(value: boolean) {
    this.loading = value;
  }

  private setSubmitting(value: boolean) {
    this.submitting = value;
  }

  private setError(value: Error | null) {
    this.error = value;
  }
}

export default GroupEdit;
