import dayjs, { Dayjs } from 'dayjs';
import app from '../app/App';
import AssistantAction from './AssistantAction';
import AssistantActionName from './AssistantActionName';
import AssistantGearSource from './AssistantGearSource';
import {
  AssistantGearItem,
  readGearItems,
  readOptionalString,
  readString,
  readStringList,
} from './AssistantActionInput';

// 적용 카드의 항목 줄 하나 — 라벨(흐린 글자)과 값.
export interface AssistantActionLine {
  label: string;
  value: string;
}

// 도구별 고정 제목(AS-3).
const TITLE_KEYS: Record<AssistantActionName, string> = {
  [AssistantActionName.CreateTrip]: 'assistant.action.title.createTrip',
  [AssistantActionName.AddGears]: 'assistant.action.title.addGears',
  [AssistantActionName.RemoveGears]: 'assistant.action.title.removeGears',
  [AssistantActionName.UpdateTripInfo]: 'assistant.action.title.updateTripInfo',
  [AssistantActionName.SetDestination]: 'assistant.action.title.setDestination',
  [AssistantActionName.UpdateMemo]: 'assistant.action.title.updateMemo',
};

// 여행 기간 표시 — 배낭 목록·첫 여행 가이드와 같은 형식(BAG-1).
export const formatTripPeriod = (startDate: Dayjs, endDate: Dayjs): string => {
  const l10n = app.getL10n();
  const format = l10n.t('bag.dateShortFormat');

  if (startDate.isSame(endDate, 'day')) {
    return startDate.format(format);
  }

  return `${startDate.format(format)}${l10n.t('bag.dateRangeSeparator')}${endDate.format(format)}`;
};

const formatInputDate = (value: unknown): string | null => {
  const text = readOptionalString(value);

  if (!text) {
    return null;
  }

  const date = dayjs(text);

  return date.isValid() ? date.format(app.getL10n().t('bag.dateShortFormat')) : text;
};

const formatInputPeriod = (start: unknown, end: unknown): string | null => {
  const startDate = dayjs(readString(start));
  const endDate = dayjs(readString(end));

  if (!startDate.isValid() || !endDate.isValid()) {
    return null;
  }

  return formatTripPeriod(startDate, endDate);
};

// 장비 목록 값 — 한 줄에 하나씩 `· 이름 (창고/카탈로그)`. 적용 전에 전부 보여야 해서 자르지 않는다.
const formatGearList = (names: string[]): string => {
  return names
    .map(name => app.getL10n().t('assistant.action.gearItem', { name }))
    .join('\n');
};

const getGearItemLabel = (item: AssistantGearItem): string => {
  const name = item.name || item.gearId;
  const sourceKey =
    item.source === AssistantGearSource.Catalog
      ? 'assistant.action.source.catalog'
      : 'assistant.action.source.warehouse';

  return app
    .getL10n()
    .t('assistant.action.gearWithSource', { name, source: app.getL10n().t(sourceKey) });
};

export const getAssistantActionTitle = (action: AssistantAction): string => {
  const name = action.getName();

  return name ? app.getL10n().t(TITLE_KEYS[name]) : action.getRawName();
};

const line = (labelKey: string, value: string | null): AssistantActionLine[] => {
  if (!value) {
    return [];
  }

  return [{ label: app.getL10n().t(`assistant.action.line.${labelKey}`), value }];
};

const getGearLines = (labelKey: string, names: string[]): AssistantActionLine[] => {
  if (names.length === 0) {
    return [];
  }

  return [
    {
      label: app
        .getL10n()
        .t(`assistant.action.line.${labelKey}`, { count: names.length }),
      value: formatGearList(names),
    },
  ];
};

// 카드 본문의 항목 줄(AS-3) — 모델이 넘긴 입력을 사람이 읽는 줄로 바꾼다.
export const getAssistantActionLines = (
  action: AssistantAction
): AssistantActionLine[] => {
  const input = action.getInput();

  switch (action.getName()) {
    case AssistantActionName.CreateTrip: {
      return [
        ...line('name', readOptionalString(input.name)),
        ...line('period', formatInputPeriod(input.startDate, input.endDate)),
        ...line('destination', readOptionalString(input.campSpotName)),
        ...getGearLines(
          'gears',
          readGearItems(input.gears).map(getGearItemLabel)
        ),
        ...line('memo', readOptionalString(input.memo)),
      ];
    }
    case AssistantActionName.AddGears: {
      return getGearLines(
        'gears',
        readGearItems(input.items).map(getGearItemLabel)
      );
    }
    case AssistantActionName.RemoveGears: {
      const names = readStringList(input.names);

      return getGearLines(
        'gears',
        names.length > 0 ? names : readStringList(input.gearIds)
      );
    }
    case AssistantActionName.UpdateTripInfo: {
      const hasStart = readString(input.startDate).length > 0;
      const hasEnd = readString(input.endDate).length > 0;

      return [
        ...line('name', readOptionalString(input.name)),
        ...(hasStart && hasEnd
          ? line('period', formatInputPeriod(input.startDate, input.endDate))
          : [
              ...line('startDate', formatInputDate(input.startDate)),
              ...line('endDate', formatInputDate(input.endDate)),
            ]),
      ];
    }
    case AssistantActionName.SetDestination: {
      return line('destination', readOptionalString(input.name));
    }
    case AssistantActionName.UpdateMemo: {
      return line('memo', readOptionalString(input.memo));
    }
    default: {
      return [];
    }
  }
};
