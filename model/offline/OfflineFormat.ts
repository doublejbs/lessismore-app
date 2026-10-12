import dayjs from 'dayjs';
import { getAppTranslation } from '@/model/l10n/L10nRegistry';

const KILOBYTE = 1024;
const MEGABYTE = KILOBYTE * 1024;

// 사람이 읽는 용량(OF-1 `1.8MB`). 1MB 미만은 KB 정수로 적는다.
export const formatOfflineBytes = (bytes: number): string => {
  if (bytes >= MEGABYTE) {
    return `${(Math.round((bytes / MEGABYTE) * 10) / 10).toFixed(1)}MB`;
  }

  return `${Math.max(1, Math.round(bytes / KILOBYTE))}KB`;
};

// 저장·갱신 날짜(OF-2 `10.09 갱신` · OF-5 `10.09 저장본`). 형식은 언어별 키(`offline.dateFormat`)가 정한다.
export const formatOfflineDate = (iso: string): string => {
  const date = dayjs(iso);

  if (!date.isValid()) {
    return '';
  }

  return date.format(getAppTranslation('offline.dateFormat'));
};
