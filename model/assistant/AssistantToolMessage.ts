// 모델에게 돌려주는 도구 결과 오류 문구(AS-5 계약). 사용자에게 보이는 사유는 l10n `assistant.action.failure.*`.
export const ASSISTANT_TOOL_MESSAGE = {
  noTrip: '아직 여행이 없어요', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  dateOrder: '종료일이 시작일보다 빠릅니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  invalidName: '여행 이름이 비어 있습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  invalidDate: '날짜 형식이 YYYY-MM-DD가 아닙니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  tripNotFound: '여행을 찾을 수 없습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  spotNotFound: '박지를 찾을 수 없습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  noGears: '담을 수 있는 장비가 없습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  notInTrip: '여행에 담긴 장비가 아닙니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  nothingToUpdate: '바꿀 값이 없습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  memoEmpty: '메모가 비어 있어요', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  saveFailed: '저장하지 못했습니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  unknownTool: '알 수 없는 도구입니다', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
  skipped: '사용자가 건너뜀', // l10n-ignore: 모델에 보내는 도구 결과 계약 문자열
} as const;
