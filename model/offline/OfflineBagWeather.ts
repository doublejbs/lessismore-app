import dayjs from 'dayjs';
import app from '@/model/app/App';
import BagWeather from '@/model/bag/BagWeather';
import OfflineTripAccess from './OfflineTripAccess';

/**
 * 여행지 화면(`/bag/{id}/weather`)의 데이터 로드 (OF-5). 온라인이면 기존 그대로 배낭 문서에서 읽고
 * 신선도를 맞춘다. 오프라인이면 저장본의 여행지·날씨 스냅샷을 그대로 주입한다 — 다시 조회하지 않는다.
 * 열 수 없는 저장본(미저장·잠김)이면 아무것도 주입하지 않는다(여행지 없음 화면이 된다).
 */
export const loadBagWeather = async (
  bagWeather: BagWeather,
  bagId: string
): Promise<void> => {
  const store = app.getOfflineTripStore();

  if (!store || app.getNetworkStatus().isOnline()) {
    await bagWeather.load();

    return;
  }

  if (store.getAccess(bagId) !== OfflineTripAccess.Available) {
    return;
  }

  const snapshot = await store.load(bagId);

  if (!snapshot) {
    return;
  }

  const { bag } = snapshot;

  bagWeather.hydrate(
    bag.location,
    bag.weather,
    dayjs(bag.startDate),
    dayjs(bag.endDate)
  );
};
