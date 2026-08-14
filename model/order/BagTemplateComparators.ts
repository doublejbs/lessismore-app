import BagTemplate from '@/model/bag/BagTemplate';
import OrderType from './OrderType';

// 코드포인트 순 문자열 비교(DM-25). localeCompare는 로케일 규칙을 적용하므로 쓰지 않는다.
const compareByCodePoint = (left: string, right: string): number => {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
};

const compareByID = (left: BagTemplate, right: BagTemplate): number =>
  compareByCodePoint(left.getID(), right.getID());

const compareByCreatedDesc = (
  left: BagTemplate,
  right: BagTemplate
): number => {
  const leftValue = left.getCreatedAt().valueOf();
  const rightValue = right.getCreatedAt().valueOf();
  const leftValid = Number.isFinite(leftValue);
  const rightValid = Number.isFinite(rightValue);

  if (!leftValid && rightValid) {
    return 1;
  }

  if (leftValid && !rightValid) {
    return -1;
  }

  if (leftValid && rightValid && leftValue !== rightValue) {
    return rightValue - leftValue;
  }

  return compareByID(left, right);
};

const compareByWeight = (
  left: BagTemplate,
  right: BagTemplate,
  descending: boolean
): number => {
  const leftValue = left.getWeightGram();
  const rightValue = right.getWeightGram();

  if (leftValue !== rightValue) {
    return descending ? rightValue - leftValue : leftValue - rightValue;
  }

  return compareByID(left, right);
};

const compareByNameAsc = (
  left: BagTemplate,
  right: BagTemplate
): number => {
  const leftName = left.getName();
  const rightName = right.getName();
  const nameOrder = compareByCodePoint(leftName, rightName);

  return nameOrder !== 0 ? nameOrder : compareByID(left, right);
};

const compareByWeightDesc = (left: BagTemplate, right: BagTemplate): number =>
  compareByWeight(left, right, true);

const compareByWeightAsc = (left: BagTemplate, right: BagTemplate): number =>
  compareByWeight(left, right, false);

// 선택값이 아직 복원되지 않았거나 알 수 없는 값이면 BT-5 기본 정렬을 쓴다.
export const getBagTemplateComparator = (
  order?: OrderType
): ((left: BagTemplate, right: BagTemplate) => number) => {
  switch (order) {
    case OrderType.WeightDesc:
      return compareByWeightDesc;
    case OrderType.WeightAsc:
      return compareByWeightAsc;
    case OrderType.NameAsc:
      return compareByNameAsc;
    case OrderType.CreatedDesc:
    default:
      return compareByCreatedDesc;
  }
};
