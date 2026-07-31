import BagItem from '@/model/bag/BagItem';
import OrderType from './OrderType';

/**
 * 배낭 목록 정렬 비교자(BAG-6).
 * 목록 조회가 `in` 청크 분할이라 서버 `orderBy`를 쓸 수 없어 정렬은 전부 클라이언트에서 한다(DM-25).
 * 조회 결과에는 정렬로 달라지는 데이터가 없으므로 재조회 없이 이미 받아 둔 배열만 다시 정렬한다.
 */

// 코드포인트 순 문자열 비교(Firestore 문자열 정렬과 동일). localeCompare를 쓰지 않는다 —
// 한글 로케일 규칙이 적용돼 Firestore와 순서가 갈린다(DM-25).
export const compareByCodePoint = (a: string, b: string): number => {
  if (a < b) {
    return -1;
  }

  if (a > b) {
    return 1;
  }

  return 0;
};

// startDate 비교 — 값이 없는 항목(null)은 방향과 무관하게 항상 뒤로 보낸다(BAG-6).
// 값 없음은 "가장 오래됨"이 아니라 미상이라 오래된 여행순에서도 맨 뒤다.
// 동률은 Firestore orderBy 동률 규칙과 같이 문서 ID 오름차순으로 타이브레이크해
// users/{uid}.bags 배열 순서에 좌우되지 않는 결정적 순서를 준다(DM-25).
const compareByStartDate = (
  a: BagItem,
  b: BagItem,
  descending: boolean
): number => {
  const aValue = a.getStartDateValue();
  const bValue = b.getStartDateValue();

  if (aValue === null && bValue !== null) {
    return 1;
  }

  if (aValue !== null && bValue === null) {
    return -1;
  }

  if (aValue !== null && bValue !== null && aValue !== bValue) {
    return descending ? bValue - aValue : aValue - bValue;
  }

  return compareByCodePoint(a.getID(), b.getID());
};

const compareByStartDateDesc = (a: BagItem, b: BagItem): number =>
  compareByStartDate(a, b, true);

const compareByStartDateAsc = (a: BagItem, b: BagItem): number =>
  compareByStartDate(a, b, false);

/**
 * 추가 순 비교(BAG-6) — 값 없음은 방향과 무관하게 항상 뒤로 보낸다.
 * `createdAt`이 없는 레거시 문서는 `editDate`로 대체된 값이 들어온다(BagItem.getCreatedValue).
 */
const compareByCreatedDesc = (a: BagItem, b: BagItem): number => {
  const aValue = a.getCreatedValue();
  const bValue = b.getCreatedValue();

  if (aValue === null && bValue !== null) {
    return 1;
  }

  if (aValue !== null && bValue === null) {
    return -1;
  }

  if (aValue !== null && bValue !== null && aValue !== bValue) {
    return bValue - aValue;
  }

  return compareByCodePoint(a.getID(), b.getID());
};

// 무게 비교 — 배낭의 0g은 무게 미입력이 아니라 빈 배낭이므로 창고 WH-3의 0g 예외를 적용하지 않는다(BAG-6).
const compareByBagWeight = (
  a: BagItem,
  b: BagItem,
  descending: boolean
): number => {
  const aValue = a.getWeightGram();
  const bValue = b.getWeightGram();

  if (aValue !== bValue) {
    return descending ? bValue - aValue : aValue - bValue;
  }

  return compareByCodePoint(a.getID(), b.getID());
};

const compareByBagWeightDesc = (a: BagItem, b: BagItem): number =>
  compareByBagWeight(a, b, true);

const compareByBagWeightAsc = (a: BagItem, b: BagItem): number =>
  compareByBagWeight(a, b, false);

// 이름 오름차순 — 코드포인트 순으로 비교한다.
// 레거시 문서는 name이 없을 수 있는데(DM-5), undefined끼리는 `<`도 `>`도 false라 비교자가
// 비추이(non-transitive)해져 정렬 결과가 비결정적이 된다. 장비 이름 비교(BagStore.compareByNameAsc)와
// 같은 정책으로 빈 이름은 ''로 보고 뒤로 보낸다.
const compareByBagNameAsc = (a: BagItem, b: BagItem): number => {
  const aName = a.getName() || '';
  const bName = b.getName() || '';

  if (aName && !bName) {
    return -1;
  }

  if (!aName && bName) {
    return 1;
  }

  const nameOrder = compareByCodePoint(aName, bName);

  return nameOrder !== 0 ? nameOrder : compareByCodePoint(a.getID(), b.getID());
};

// 선택된 정렬에 해당하는 비교자를 준다(BAG-6).
// 정렬 미복원(undefined)·알 수 없는 값은 기본 정렬(최근 추가순)로 떨어진다.
export const getBagComparator = (
  order?: OrderType
): ((a: BagItem, b: BagItem) => number) => {
  switch (order) {
    case OrderType.StartDateAsc: {
      return compareByStartDateAsc;
    }
    case OrderType.StartDateDesc: {
      return compareByStartDateDesc;
    }
    case OrderType.WeightDesc: {
      return compareByBagWeightDesc;
    }
    case OrderType.WeightAsc: {
      return compareByBagWeightAsc;
    }
    case OrderType.NameAsc: {
      return compareByBagNameAsc;
    }
    case OrderType.CreatedDesc:
    default: {
      return compareByCreatedDesc;
    }
  }
};
