import { useEffect, useState } from 'react';
import app from '@/model/app/App';
import { loadStaticMapImageManager } from '@/model/map/MapLibreModule';
import {
  getStaticMapImage,
  StaticMapImageRequest,
} from '@/model/map/StaticMapImage';
import StaticMapImageStatus from './StaticMapImageStatus';

interface StaticMapImageResult {
  uri: string | null;
  status: StaticMapImageStatus;
}

interface ResolvedState {
  key: string;
  uri: string | null;
}

// 위도·경도가 유효 범위의 실수인지. (0,0)은 좌표 미기입이 그대로 저장된 값이라 배제한다.
const isValidCoordinate = (latitude: number, longitude: number): boolean => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return false;
  }

  return latitude !== 0 || longitude !== 0;
};

// 요청을 그릴 수 있는지 — 레이아웃 측정 전 폭 0 같은 값으로 캐시를 오염시키지 않는다.
const isDrawableRequest = (request: StaticMapImageRequest): boolean => {
  if (!isValidCoordinate(request.latitude, request.longitude)) {
    return false;
  }

  return Math.round(request.width) > 0 && Math.round(request.height) > 0;
};

// 요청 동일성 키. 같은 키면 다시 부르지 않는다(렌더마다 새 객체가 와도).
const getRequestKey = (request: StaticMapImageRequest | null): string | null => {
  if (!request || !isDrawableRequest(request)) {
    return null;
  }

  return [
    request.latitude,
    request.longitude,
    request.zoom,
    Math.round(request.width),
    Math.round(request.height),
  ].join('|');
};

/**
 * 정적 지도 썸네일(MAP-3) 훅. 요청이 바뀔 때만 `getStaticMapImage`를 부르고, 결과 `file://` URI와
 * 상태를 돌려준다. 언마운트·요청 변경 뒤 도착한 결과는 버린다.
 *
 * - `request`가 `null`이거나 그릴 수 없으면 `Idle` — 호출부는 밴드를 그리지 않는다.
 * - 실패·오프라인(캐시 없음)은 `Failed` — 호출부는 밴드 없는 폴백(BAG-1).
 * - 웹·옛 바이너리(정적 지도 모듈 없음)는 **처음부터** `Failed`다 — `Loading` 면이 한 번 깜빡이지 않게.
 * - 연결 상태는 `NetworkStatus`에서 읽는다(observer 안에서 부르면 연결이 돌아올 때 다시 시도한다).
 */
const useStaticMapImage = (
  request: StaticMapImageRequest | null
): StaticMapImageResult => {
  const key = getRequestKey(request);
  const isOffline = app.getNetworkStatus().isOffline();
  // 바이너리가 실행 중에 바뀌지 않으므로 처음 한 번만 본다(로더가 결과를 캐시한다).
  const [isSupported] = useState(() => loadStaticMapImageManager() !== null);
  const [resolved, setResolved] = useState<ResolvedState | null>(null);

  useEffect(() => {
    if (key === null || request === null || !isSupported) {
      return;
    }

    let isActive = true;

    const loadImage = async () => {
      const uri = await getStaticMapImage(request, { isOffline });

      if (isActive) {
        setResolved({ key, uri });
      }
    };

    void loadImage();

    return () => {
      isActive = false;
    };
    // 요청 객체는 렌더마다 새로 만들어진다 — 동일성은 `key`가 대표한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOffline, isSupported, key]);

  if (key === null) {
    return { uri: null, status: StaticMapImageStatus.Idle };
  }

  if (!isSupported) {
    return { uri: null, status: StaticMapImageStatus.Failed };
  }

  if (resolved === null || resolved.key !== key) {
    return { uri: null, status: StaticMapImageStatus.Loading };
  }

  if (resolved.uri === null) {
    return { uri: null, status: StaticMapImageStatus.Failed };
  }

  return { uri: resolved.uri, status: StaticMapImageStatus.Ready };
};

export default useStaticMapImage;
