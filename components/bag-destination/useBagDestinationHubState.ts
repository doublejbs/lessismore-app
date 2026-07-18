import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import app from '@/model/app/App';
import BagWeather from '@/model/bag/BagWeather';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';

interface Params {
  bagWeather: BagWeather;
}

// 여행지 허브(DST-8) 화면 상태. 공용 선택기 열기·연결 박지 지연 조회·길찾기·상세 이동을 담당한다.
// 박지 조회는 날씨와 독립적으로(비차단) 돌리고, 실패·삭제·비활성은 삼켜 상세 이동만 숨긴다(DST-7).
const useBagDestinationHubState = ({ bagWeather }: Params) => {
  const location = bagWeather.getLocation();
  const campSpotId = location?.campSpotId ?? null;

  const [pickerVisible, setPickerVisible] = useState(false);
  // 상세 오버레이로 띄울 박지 id. null이면 닫힘(DST-8).
  const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
  // 연결 박지 스냅샷(유형색·유형·지역·상세 이동 가능 여부). null이면 자유 위치이거나 조회 불가 상태다.
  const [linkedSpot, setLinkedSpot] = useState<CampSpot | null>(null);

  useEffect(() => {
    if (!campSpotId) {
      setLinkedSpot(null);

      return;
    }

    let cancelled = false;

    const fetchSpot = async () => {
      try {
        const spot = await app.getCampSpotStore()?.getSpot(campSpotId);

        if (cancelled) {
          return;
        }

        // 삭제(null)·비활성(status !== active)이면 저장된 이름·좌표는 유지하되 박지로 취급하지 않는다(DST-7).
        setLinkedSpot(spot && spot.status === 'active' ? spot : null);
      } catch (e) {
        console.error('여행지 박지 조회 실패:', e);

        if (!cancelled) {
          setLinkedSpot(null);
        }
      }
    };

    void fetchSpot();

    return () => {
      cancelled = true;
    };
  }, [campSpotId]);

  const handleOpenPicker = useCallback(() => {
    setPickerVisible(true);
  }, []);

  const handleClosePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  // 확정한 여행지 저장. 실패는 던져 선택기가 열린 채 재시도할 수 있게 한다(DST-6).
  const handleConfirmLocation = useCallback(
    async (next: BagLocation) => {
      await bagWeather.updateLocation(next);
    },
    [bagWeather]
  );

  // 박지 상세(CS-3)를 오버레이(pageSheet)로 풀로 띄운다(DST-8). 허브는 라우트라
  // /camp-site/{id} push도 되지만, detent가 아닌 풀 시트 + CTA 숨김을 위해 오버레이를 쓴다.
  const handleOpenSpotDetail = useCallback(() => {
    if (!campSpotId) {
      return;
    }

    setDetailSpotId(campSpotId);
  }, [campSpotId]);

  const handleCloseSpotDetail = useCallback(() => {
    setDetailSpotId(null);
  }, []);

  // 길찾기(DST-8): 네이버 지도 앱(nmap://place) → 실패 시 웹 검색 폴백. 좌표만 있으면 박지·자유 위치 모두 동작.
  // CampSiteDetail.openNaverMap과 동일한 패턴(임포트하지 않고 복제).
  const handleOpenDirections = useCallback(async () => {
    if (!location) {
      return;
    }

    app.getAnalyticsManager()?.logClick('bag_destination_directions');

    const { latitude, longitude, name } = location;
    const appUrl = `nmap://place?lat=${latitude}&lng=${longitude}&name=${encodeURIComponent(name)}&appname=com.doublejbs.useless`;
    const webUrl = `https://map.naver.com/p/search/${encodeURIComponent(name)}`;

    try {
      await Linking.openURL(appUrl);
    } catch {
      try {
        await Linking.openURL(webUrl);
      } catch {
        // 웹 폴백까지 실패하면 조용히 무시
      }
    }
  }, [location]);

  return {
    location,
    campSpotId,
    linkedSpot,
    pickerVisible,
    detailSpotId,
    isMapSupported: Platform.OS !== 'web',
    handleOpenPicker,
    handleClosePicker,
    handleConfirmLocation,
    handleOpenSpotDetail,
    handleCloseSpotDetail,
    handleOpenDirections,
  };
};

export default useBagDestinationHubState;
