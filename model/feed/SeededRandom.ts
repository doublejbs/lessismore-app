// FD-1 셔플: 새로고침 시드로 인터리브 순서를 흔들되 스크롤 중에는 불변이어야 한다.
// 시드 기반 결정적 의사난수(LCG)를 써서 같은 시드+인덱스면 항상 같은 값을 낸다.

// 32비트 정수 시드를 생성한다(새로고침마다 재생성).
export const createSeed = (): number => {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
};

const LCG_MULTIPLIER = 1664525;

const LCG_INCREMENT = 1013904223;

const LCG_MODULUS = 0x100000000;

// (seed, index)에 대해 [0, 1) 결정적 난수를 반환한다.
export const seededRandom = (seed: number, index: number): number => {
  let state = (seed + index * 2654435761) % LCG_MODULUS;

  if (state < 0) {
    state += LCG_MODULUS;
  }

  state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;

  if (state < 0) {
    state += LCG_MODULUS;
  }

  return state / LCG_MODULUS;
};

// 시드 기반 Fisher-Yates 셔플(원본 불변, 새 배열 반환). round는 라운드별 순서 다양화용 오프셋.
export const seededShuffle = <T>(
  items: T[],
  seed: number,
  round: number
): T[] => {
  const result = items.slice();

  for (let i = result.length - 1; i > 0; i -= 1) {
    const rand = seededRandom(seed, round * 1000 + i);
    const j = Math.floor(rand * (i + 1));
    const temp = result[i]!;

    result[i] = result[j]!;
    result[j] = temp;
  }

  return result;
};
