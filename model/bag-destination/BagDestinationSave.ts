import dayjs from 'dayjs';
import BagWeather from '../bag/BagWeather';
import BagStore from '../store/BagStore';
import { BagLocation } from './BagLocation';

/**
 * 상세 화면 밖에서 배낭 여행지를 저장한다 (CS-5 → DST-6 · GRP-5 일정 맞춤).
 *
 * 좌표 변경 시 날씨 캐시 제거까지 스토어가 한 번의 쓰기로 처리하고, 저장 직후 그 배낭의 현재 여행 기간
 * 날씨를 조회·저장한다 — 배낭을 열지 않아도 새 여행지 날씨가 준비된다.
 * 날씨 조회 실패는 여행지 저장과 분리해 호출자가 안내할 수 있도록 결과로 돌려준다(DST-6).
 * 박지 상세(배낭 선택 시트)와 그룹 연결(일정 맞춤)이 같은 경로를 쓴다.
 */
export const saveBagDestination = async (
  bagStore: BagStore,
  bagId: string,
  location: BagLocation
): Promise<{ weatherFailed: boolean }> => {
  const { startDate, endDate } = await bagStore.getBagWeatherData(bagId);
  const bagWeather = BagWeather.of(bagId, bagStore);

  // 여행 기간만 주입한다 — 저장 전 위치·날씨는 updateLocation이 스토어 응답으로 덮는다.
  bagWeather.hydrate(
    null,
    null,
    startDate ? dayjs(startDate) : dayjs(),
    endDate ? dayjs(endDate) : dayjs()
  );

  await bagWeather.updateLocation(location);

  return { weatherFailed: bagWeather.hasError() };
};
