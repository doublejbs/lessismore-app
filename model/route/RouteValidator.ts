import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import {
  GROUP_MAX_LATITUDE,
  GROUP_MAX_LONGITUDE,
  GROUP_ROUTE_FALLBACK_NAME,
  GROUP_ROUTE_MAX_BYTES,
  GROUP_ROUTE_MIN_SIMPLIFIED_POINTS,
  GROUP_ROUTE_NAME_MAX_LENGTH,
} from '@/model/group/GroupLimits';
import { RouteBounds, RouteDraft } from './RouteData';

/**
 * 코스(GPX) 입력 검증 — **그룹 코스(GRP-8)와 배낭 코스(BD-11)가 같은 것을 쓴다.**
 * 상한값도 `GroupLimits` 하나를 그대로 본다(DM-30: "수치를 갈라 두면 사용자가 둘을 다르게
 * 기억해야 한다"). 이름이 `GROUP_*`인 것은 상수가 먼저 그룹에서 생겼기 때문이고, 값은 하나다.
 *
 * 실패 코드가 `GroupValidationError`인 것도 같은 이유다 — 문구(`group.error.route_*`)는
 * "코스를 읽지 못했어요"처럼 그룹/배낭을 가리지 않는 말이고, 코드·문구를 두 벌로 나누면
 * 같은 실패가 화면에 따라 다른 문구로 보인다.
 */
class RouteValidator {
  /**
   * 크기를 잰 값인지 — 0·음수·비유한값은 **크기 미상**이지 "너무 큰" 것이 아니다.
   * 선택기가 크기를 주지 않고 `expo-file-system`으로도 못 재는 `content://` 파일이 여기로 온다.
   */
  public static isKnownRouteFileSize(fileSize: number) {
    return Number.isFinite(fileSize) && fileSize > 0;
  }

  // 5MB 상한 판정. 파싱 단계(GpxParser)와 조건·상수를 공유하고 에러는 각자 자기 것을 던진다.
  public static isValidRouteFileSize(fileSize: number) {
    return (
      RouteValidator.isKnownRouteFileSize(fileSize) &&
      fileSize <= GROUP_ROUTE_MAX_BYTES
    );
  }

  public static validateRouteFileSize(fileSize: number) {
    if (!RouteValidator.isKnownRouteFileSize(fileSize)) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (!RouteValidator.isValidRouteFileSize(fileSize)) {
      throw new GroupError(GroupValidationError.RouteFileTooLarge);
    }
  }

  // 코스 이름은 파일명·트랙명에서 자동으로 딸려오는 값이라 길다고 거절하지 않고 자른다.
  // 보안 규칙이 1~40자를 요구하므로 잘라낸 뒤 비면 폴백 이름을 쓴다 — 저장 이름의 단일 소스다.
  public static toRouteName(value: string) {
    const name = value.trim().slice(0, GROUP_ROUTE_NAME_MAX_LENGTH).trim();

    return name || GROUP_ROUTE_FALLBACK_NAME;
  }

  /**
   * 코스 전수 검증. 보안 규칙 `isValidRoutePayload`(그룹·배낭 양쪽)와 **같은 조건**을 본다.
   *
   * 저장 순서가 "Storage 업로드 → Firestore 쓰기"라, 여기서 거르지 않으면 업로드만 성공하고
   * 문서 쓰기가 거부돼 회수 경로 없는 고아 GPX가 남는다 — 업로더는 **업로드 전에** 이것을 부른다.
   * 축약 좌표의 500점 상한은 스토어가 잘라 쓰므로 여기서는 하한만 본다.
   * 정수 계약(`fileSize`·`pointCount`)은 스토어가 쓰기 직전 반올림해 맞춘다.
   */
  public static validateRoute(draft: RouteDraft) {
    RouteValidator.validateRouteFileSize(draft.fileSize);

    // 저장 이름은 `toRouteName`이 1~40자로 만들어 내므로(자르고, 비면 폴백) 길이를 다시 보지 않는다.
    if (draft.simplified.length < GROUP_ROUTE_MIN_SIMPLIFIED_POINTS) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (
      !RouteValidator.isNonNegativeNumber(draft.distance) ||
      !RouteValidator.isNonNegativeNumber(draft.pointCount)
    ) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (
      draft.elevationGain !== undefined &&
      !RouteValidator.isNonNegativeNumber(draft.elevationGain)
    ) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }

    if (!RouteValidator.isValidBounds(draft.bounds)) {
      throw new GroupError(GroupValidationError.RouteParseFailed);
    }
  }

  private static isValidBounds(bounds: RouteBounds) {
    return (
      RouteValidator.isValidLatitude(bounds.minLat) &&
      RouteValidator.isValidLatitude(bounds.maxLat) &&
      RouteValidator.isValidLongitude(bounds.minLng) &&
      RouteValidator.isValidLongitude(bounds.maxLng)
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

export default RouteValidator;
