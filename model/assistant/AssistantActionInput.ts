import AssistantGearSource from './AssistantGearSource';

/**
 * 쓰기 도구 입력(AS-5). 모델이 만든 값이라 타입을 믿지 않고 `read*`로 한 번 걸러 쓴다 —
 * 필수 값이 빠지면 빈 문자열·빈 배열이 되고, 적용 단계가 그것을 오류로 돌려준다.
 */

export interface AssistantGearItem {
  gearId: string;
  source: AssistantGearSource;
  name: string;
}

export const readString = (value: unknown): string => {
  return typeof value === 'string' ? value.trim() : '';
};

export const readOptionalString = (value: unknown): string | null => {
  const text = readString(value);

  return text ? text : null;
};

export const readStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map(readString).filter(item => item.length > 0);
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

export const readGearItems = (value: unknown): AssistantGearItem[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord).flatMap(item => {
    const gearId = readString(item.gearId);

    if (!gearId) {
      return [];
    }

    const source =
      item.source === AssistantGearSource.Catalog
        ? AssistantGearSource.Catalog
        : AssistantGearSource.Warehouse;

    return [{ gearId, source, name: readString(item.name) }];
  });
};
