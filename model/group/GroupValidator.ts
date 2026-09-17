import GroupError from './GroupError';
import GroupValidationError from './GroupValidationError';
import {
  GROUP_DAY_IN_MILLISECONDS,
  GROUP_MAX_DURATION_DAYS,
  GROUP_MEETING_NOTE_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
  GROUP_POINT_DESCRIPTION_MAX_LENGTH,
  GROUP_POINT_TITLE_MAX_LENGTH,
  GROUP_POINT_TITLE_MIN_LENGTH,
  GROUP_ROUTE_MAX_BYTES,
} from './GroupLimits';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// 그룹 입력 검증 (GRP-2, GRP-7, GRP-8, GRP-9). 문구는 화면이 코드로 매핑해 붙인다.
class GroupValidator {
  public static validateName(name: string) {
    const length = name.trim().length;

    if (length < GROUP_NAME_MIN_LENGTH || length > GROUP_NAME_MAX_LENGTH) {
      throw new GroupError(GroupValidationError.NameLength);
    }
  }

  // 시작 ≤ 종료, 시작일과 종료일을 모두 세어 최대 30일(DM-29).
  public static validateDateRange(startDate: string, endDate: string) {
    if (!DATE_PATTERN.test(startDate) || !DATE_PATTERN.test(endDate)) {
      throw new GroupError(GroupValidationError.DateRange);
    }

    const start = Date.parse(`${startDate}T00:00:00Z`);
    const end = Date.parse(`${endDate}T00:00:00Z`);

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      throw new GroupError(GroupValidationError.DateRange);
    }

    const days = Math.round((end - start) / GROUP_DAY_IN_MILLISECONDS) + 1;

    if (days > GROUP_MAX_DURATION_DAYS) {
      throw new GroupError(GroupValidationError.DateTooLong);
    }
  }

  public static validatePointTitle(title: string) {
    const length = title.trim().length;

    if (
      length < GROUP_POINT_TITLE_MIN_LENGTH ||
      length > GROUP_POINT_TITLE_MAX_LENGTH
    ) {
      throw new GroupError(GroupValidationError.PointTitleLength);
    }
  }

  public static validatePointDescription(description: string) {
    if (description.trim().length > GROUP_POINT_DESCRIPTION_MAX_LENGTH) {
      throw new GroupError(GroupValidationError.PointDescriptionLength);
    }
  }

  public static validateMeetingNote(meetingNote: string) {
    if (meetingNote.trim().length > GROUP_MEETING_NOTE_MAX_LENGTH) {
      throw new GroupError(GroupValidationError.MeetingNoteLength);
    }
  }

  public static validateRouteFileSize(fileSize: number) {
    if (!(fileSize > 0) || fileSize > GROUP_ROUTE_MAX_BYTES) {
      throw new GroupError(GroupValidationError.RouteFileTooLarge);
    }
  }
}

export default GroupValidator;
