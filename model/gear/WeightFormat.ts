/**
 * 무게 표기의 단일 소스([DataModel.md](../../specs/DataModel.md) DM-26).
 *
 * 저장값은 어디서나 **그램 단위**다(DM-3 `gear.weight`, DM-5 `bag.weight`) — 합산·정렬 같은
 * 계산은 g 정수로 하고, 사람이 읽는 단위 변환은 이 파일에서만 한다. 화면마다 `toFixed()`를
 * 따로 부르면 같은 배낭이 `0.00kg`·`3.23kg`·`8.4kg`으로 갈린다(2026-08-11 디자인 리뷰).
 *
 * - 장비 개별 무게는 **항상 g**(`55g` `7200g`). 창고 목록의 세로 비교축이라 값 크기에 따라
 *   단위를 바꾸지 않고, 천 단위 구분자도 넣지 않는다.
 * - 배낭·창고 **합계는 kg, 소수 한 자리**이며 뒤의 `.0`은 뗀다(`0kg` `3.2kg` `10kg` `44.7kg`).
 * - 숫자와 단위는 **한 덩어리**로 조판한다. 단위를 다른 크기로 앉히는 자리(히어로 수치)만
 *   `*Value`로 숫자를 받아 같은 텍스트 블록 안에서 잇고, `kg 총 무게` 같은 별도 라벨 줄은 두지 않는다.
 */

/**
 * 무게 입력값. 장비 문서의 `weight`는 number·string이 혼재하고 미입력이 빈 문자열로 남아
 * 있어(DM-3) 정규화를 이 파일에서 한 번만 한다 — 호출부마다 `Number()`를 두지 않는다.
 */
export type WeightInput = number | string | null | undefined;

const GRAMS_PER_KILOGRAM = 1000;

/**
 * 무게가 없는 자리에 놓는 말. 목록 행(`LiquidMetricRow`)과 스크린리더 라벨이 같은 말을
 * 써야 눈으로 보는 것과 들리는 것이 갈리지 않는다.
 */
export const MISSING_WEIGHT_LABEL = '무게 미입력';

const toGrams = (input: WeightInput): number => {
  const grams = Number(input);

  return Number.isFinite(grams) ? grams : 0;
};

/**
 * 무게가 입력돼 있는지. 0·빈 문자열·`null`·`undefined`·숫자 아님은 모두 **미입력**이다 —
 * 장비 무게 0g은 실제 무게가 아니라 아직 적지 않은 값이다.
 *
 * 배낭 총 무게 0은 미입력이 아니라 **빈 배낭**이므로 이 판정을 쓰지 않는다([Bag.md](../../specs/Bag.md) BAG-6).
 */
export const hasWeight = (input: WeightInput): boolean => {
  return toGrams(input) > 0;
};

/** 장비 개별 무게의 숫자 부분 → `55` `7200`. 단위를 다른 크기로 앉히는 자리에서만 쓴다. */
export const formatGearWeightValue = (input: WeightInput): string => {
  return String(Math.round(toGrams(input)));
};

/** 장비 개별 무게 → `55g` `7200g`. */
export const formatGearWeight = (input: WeightInput): string => {
  return `${formatGearWeightValue(input)}g`;
};

/**
 * 목록 행의 수치 칸에 넣을 장비 무게. 미입력이면 `null`이고, 그 자리는 `LiquidMetricRow`가
 * `무게 미입력`으로 채운다 — 조건부로 프롭을 빼면 칸이 사라져 우측 정렬축이 무너진다.
 * 스크린리더 라벨도 같은 판정을 써야 눈으로 보는 것과 들리는 것이 갈리지 않는다.
 */
export const formatGearWeightOrNull = (input: WeightInput): string | null => {
  return hasWeight(input) ? formatGearWeight(input) : null;
};

/**
 * 배낭·창고 합계의 숫자 부분 → `0` `3.2` `10` `44.7`.
 *
 * 단위를 다른 크기로 앉히는 히어로 수치와, 대문자 `KG`를 쓰는 내보내기 캔버스
 * ([BagShare.md](../../specs/BagShare.md) BS-4·BS-8)가 붙여 쓴다.
 */
export const formatBagWeightValue = (input: WeightInput): string => {
  const kilograms = toGrams(input) / GRAMS_PER_KILOGRAM;

  // 소수 한 자리로 반올림한 뒤 number로 두면 뒤의 `.0`이 저절로 떨어진다(`10` `3.2`).
  return String(Math.round(kilograms * 10) / 10);
};

/** 배낭·창고 합계 → `0kg` `3.2kg` `10kg` `44.7kg`. */
export const formatBagWeight = (input: WeightInput): string => {
  return `${formatBagWeightValue(input)}kg`;
};

/**
 * 저장된 **kg 스냅샷**을 같은 규칙으로 읽는다 — 박지 후기의 `bagWeight`(DM-20)가 유일한
 * 대상이다. 옛 문서에 `8.40` 같은 두 자리 값이 남아 있어 표시 시점에 정규화한다.
 * 새로 계산하는 값은 g에서 만들므로 `formatBagWeight`를 쓴다.
 */
export const formatBagWeightFromKilograms = (input: WeightInput): string => {
  return formatBagWeight(Number(input) * GRAMS_PER_KILOGRAM);
};
