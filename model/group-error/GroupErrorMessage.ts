import app from '@/model/app/App';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import {
  GROUP_MAX_DURATION_DAYS,
  GROUP_MAX_PER_USER,
  GROUP_MAX_POINT_COUNT,
  GROUP_MAX_ROUTE_COUNT,
  GROUP_MEETING_NOTE_MAX_LENGTH,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_MIN_LENGTH,
  GROUP_POINT_DESCRIPTION_MAX_LENGTH,
  GROUP_POINT_TITLE_MAX_LENGTH,
  GROUP_POINT_TITLE_MIN_LENGTH,
  GROUP_ROUTE_MAX_BYTES,
} from '@/model/group/GroupLimits';

const BYTES_IN_MEGA_BYTE = 1024 * 1024;

/**
 * 실패 코드에 들어갈 상한값. 문구에 숫자를 그대로 적으면 `GroupLimits`가 바뀔 때 갈라지므로
 * 상수를 그대로 흘려보낸다 — 문구는 `{{min}}`·`{{max}}`로 받는다.
 */
const MESSAGE_PARAMS: Partial<
  Record<GroupValidationError, Record<string, number>>
> = {
  [GroupValidationError.NameLength]: {
    min: GROUP_NAME_MIN_LENGTH,
    max: GROUP_NAME_MAX_LENGTH,
  },
  [GroupValidationError.DateTooLong]: { max: GROUP_MAX_DURATION_DAYS },
  [GroupValidationError.GroupLimitExceeded]: { max: GROUP_MAX_PER_USER },
  [GroupValidationError.PointLimitExceeded]: { max: GROUP_MAX_POINT_COUNT },
  [GroupValidationError.PointTitleLength]: {
    min: GROUP_POINT_TITLE_MIN_LENGTH,
    max: GROUP_POINT_TITLE_MAX_LENGTH,
  },
  [GroupValidationError.PointDescriptionLength]: {
    max: GROUP_POINT_DESCRIPTION_MAX_LENGTH,
  },
  [GroupValidationError.RouteLimitExceeded]: { max: GROUP_MAX_ROUTE_COUNT },
  [GroupValidationError.RouteFileTooLarge]: {
    max: GROUP_ROUTE_MAX_BYTES / BYTES_IN_MEGA_BYTE,
  },
  [GroupValidationError.MeetingNoteLength]: {
    max: GROUP_MEETING_NOTE_MAX_LENGTH,
  },
};

/**
 * `GroupValidationError` → 사용자 문구 매핑의 단일 소스 (GRP-2/3/4).
 * 도메인은 코드만 싣고 문구를 모르므로 화면이 붙이는데, 화면마다 매핑을 따로 두면 같은 코드가
 * 화면에 따라 다른 문구로 보인다. 그룹을 다루는 모든 화면이 이 함수를 쓴다.
 */
export const getGroupValidationMessage = (
  code: GroupValidationError
): string => {
  return app.getL10n().t(`group.error.${code}`, MESSAGE_PARAMS[code] ?? {});
};

// 도메인이 던진 값을 그대로 받는 입구. 그룹 오류가 아니면 일반 문구로 떨어진다.
export const getGroupErrorMessage = (error: unknown): string => {
  if (!(error instanceof GroupError)) {
    return app.getL10n().t('group.error.unknown');
  }

  return getGroupValidationMessage(error.code);
};
