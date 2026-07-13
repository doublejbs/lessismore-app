// 분석(analytics)에서 제외할 내부(개발자) 계정 Firebase UID 허용목록.
// 여기 등록된 UID로 로그인하면 이벤트에 `is_internal=true` 사용자 속성이 붙어
// GA4/Firebase 대시보드에서 내부 트래픽으로 필터·제외할 수 있다(수집은 그대로).
const INTERNAL_UIDS: readonly string[] = [
  'KkmaLpxPYLbmJKGkSTLMuMcD5l82', // doublejbjy@gmail.com (개발자)
];

export const isInternalUser = (uid: string | null | undefined): boolean => {
  if (!uid) {
    return false;
  }

  return INTERNAL_UIDS.includes(uid);
};
