import { GroupRouteBounds, GroupRouteDraft } from './GroupData';
import GroupError from './GroupError';
import GroupValidationError from './GroupValidationError';
import {
  GROUP_DAY_IN_MILLISECONDS,
  GROUP_MAX_DURATION_DAYS,
  GROUP_MAX_LATITUDE,
  GROUP_MAX_LONGITUDE,
  GROUP_MEETING_NOTE_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
  GROUP_POINT_DESCRIPTION_MAX_LENGTH,
  GROUP_POINT_TITLE_MAX_LENGTH,
  GROUP_POINT_TITLE_MIN_LENGTH,
  GROUP_ROUTE_FALLBACK_NAME,
  GROUP_ROUTE_MAX_BYTES,
  GROUP_ROUTE_MIN_SIMPLIFIED_POINTS,
  GROUP_ROUTE_NAME_MAX_LENGTH,
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

  /**
   * 크기를 잰 값인지 — 0·음수·비유한값은 **크기 미상**이지 "너무 큰" 것이 아니다.
   * 선택기가 크기를 주지 않고 `expo-file-system`으로도 못 재는 `content://` 파일이 여기로 온다.
   */
  public static isKnownRouteFileSize(fileSize: number) {
    return Number.isFinite(fileSize) && fileSize > 0;
  }

  // 5MB 상한 판정. 파싱 단계(GpxParser)와 조건·상수를 공유하고 에러는 각자 자기 것을 던진다(GRP-8).
  public static isValidRouteFileSize(fileSize: number) {
    return (
      GroupValidator.isKnownRouteFileSize(fileSize) &&
      fileSize <= GROUP_ROUTE_MAX_BYTES
    );
  }

  public static validateRouteFileSize(fileSize: number) {
    if (!GroupValidator.isKnownRouteFileSize(fileSize)) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (!GroupValidator.isValidRouteFileSize(fileSize)) {
      throw new GroupError(GroupValidationError.RouteFileTooLarge);
    }
  }

  // 코스 이름은 파일명·트랙명에서 자동으로 딸려오는 값이라 길다고 거절하지 않고 자른다(GRP-8).
  // 보안 규칙이 1~40자를 요구하므로 잘라낸 뒤 비면 폴백 이름을 쓴다 — 저장 이름의 단일 소스다.
  public static toRouteName(value: string) {
    const name = value.trim().slice(0, GROUP_ROUTE_NAME_MAX_LENGTH).trim();

    return name || GROUP_ROUTE_FALLBACK_NAME;
  }

  /**
   * 코스 전수 검증 (GRP-8). 보안 규칙 `isValidRoutePayload`와 **같은 조건**을 본다.
   *
   * 저장 순서가 "Storage 업로드 → Firestore 쓰기"라, 여기서 거르지 않으면 업로드만 성공하고
   * 문서 쓰기가 거부돼 회수 경로 없는 고아 GPX가 남는다 — 업로더는 **업로드 전에** 이것을 부른다.
   * 축약 좌표의 500점 상한은 스토어가 잘라 쓰므로 여기서는 하한만 본다.
   * 정수 계약(`fileSize`·`pointCount`)은 스토어가 쓰기 직전 반올림해 맞춘다.
   */
  public static validateRoute(draft: GroupRouteDraft) {
    GroupValidator.validateRouteFileSize(draft.fileSize);

    // 저장 이름은 `toRouteName`이 1~40자로 만들어 내므로(자르고, 비면 폴백) 길이를 다시 보지 않는다.
    if (draft.simplified.length < GROUP_ROUTE_MIN_SIMPLIFIED_POINTS) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (
      !GroupValidator.isNonNegativeNumber(draft.distance) ||
      !GroupValidator.isNonNegativeNumber(draft.pointCount)
    ) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (
      draft.elevationGain !== undefined &&
      !GroupValidator.isNonNegativeNumber(draft.elevationGain)
    ) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (!GroupValidator.isValidBounds(draft.bounds)) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }
  }

  private static isValidBounds(bounds: GroupRouteBounds) {
    return (
      GroupValidator.isValidLatitude(bounds.minLat) &&
      GroupValidator.isValidLatitude(bounds.maxLat) &&
      GroupValidator.isValidLongitude(bounds.minLng) &&
      GroupValidator.isValidLongitude(bounds.maxLng)
    );
  }

  private static isValidLatitude(value: number) {
    return (
      Number.isFinite(value) &&
      value >= -GROUP_MAX_LATITUDE &&
      value <= GROUP_MAX_LATITUDE
    );
  }

  private static isValidLongitude(value: number) {
    return (
      Number.isFinite(value) &&
      value >= -GROUP_MAX_LONGITUDE &&
      value <= GROUP_MAX_LONGITUDE
    );
  }

  private static isNonNegativeNumber(value: number) {
    return Number.isFinite(value) && value >= 0;
  }
}

export default GroupValidator;
