/**
 * Firestore 문서에서 읽은 시각을 `Date`로 정규화한다.
 *
 * 같은 필드가 서버 응답에서는 `Timestamp`, 낙관적 갱신 직후에는 `Date`, 캐시·마이그레이션
 * 산출물에서는 숫자·문자열로 올 수 있다. 값이 없으면 epoch(0)으로 떨어뜨려 `Invalid Date`가
 * 화면까지 흘러가지 않게 한다.
 */
export const toFirestoreDate = (value: unknown): Date => {
  if (value instanceof Date) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate() as Date;
  }

  if (typeof value === 'number' || typeof value === 'string') {
    return new Date(value);
  }

  return new Date(0);
};
