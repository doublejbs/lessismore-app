import GroupValidationError from '@/model/group/GroupValidationError';
import {
  getGroupErrorMessage,
  getGroupValidationMessage,
} from '@/model/group-error/GroupErrorMessage';
import GpxParseError from '@/model/route/GpxParseError';
import GpxParseErrorType from '@/model/route/GpxParseErrorType';

/**
 * GPX 읽기 실패 사유 → 사용자 문구 (GRP-8, BD-11). 그룹·배낭 코스가 같은 매핑을 쓴다.
 *
 * 문구를 새로 만들지 않고 `GroupValidationError`의 것을 그대로 쓴다 — `코스를 읽지 못했어요`와
 * `코스 파일은 5MB까지 올릴 수 있어요`는 `GroupStore.createRoute`(서버 규칙과 같은 검증)도
 * 던지는 문구라, 같은 말을 두 벌로 두면 한쪽만 고쳐질 때 사용자가 단계에 따라 다른 문구를 본다.
 * 문구 자체(`group.error.route_*`)는 "코스를 읽지 못했어요"처럼 그룹/배낭을 가리지 않는다.
 * **트랙 없음과 파싱 불가는 GRP-8이 같은 문구를 쓰라고 정한 것이다**(파일이 왜 안 읽혔는지
 * 사용자가 할 수 있는 일이 다르지 않다).
 */
const PARSE_ERROR_CODE: Record<GpxParseErrorType, GroupValidationError> = {
  [GpxParseErrorType.Invalid]: GroupValidationError.RouteParseFailed,
  [GpxParseErrorType.NoTrack]: GroupValidationError.RouteParseFailed,
  [GpxParseErrorType.TooLarge]: GroupValidationError.RouteFileTooLarge,
};

export const getRouteErrorMessage = (error: unknown): string => {
  if (error instanceof GpxParseError) {
    return getGroupValidationMessage(PARSE_ERROR_CODE[error.type]);
  }

  return getGroupErrorMessage(error);
};
