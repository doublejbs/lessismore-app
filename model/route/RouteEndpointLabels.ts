import AppLanguage from '@/model/l10n/AppLanguage';

export interface EndpointLabelImage {
  source: number;
  // 이미지 크기(pt). 글자 폭이 언어마다 달라 이미지마다 다르다.
  width: number;
  height: number;
}

export interface EndpointLabelSet {
  start: EndpointLabelImage;
  end: EndpointLabelImage;
}

/**
 * `출발`·`도착` 말풍선 라벨 (GRP-8). 네이버 지도(`RouteEndpointMarkersView`)와 오프라인 지도
 * (`OfflineMapEndpointMarkersView`)가 같은 표를 쓴다.
 *
 * 커스텀 View 마커는 네이버 지도가 스냅숏으로 굳히면서 글자·아이콘 글꼴이 빠진 채 도형만 남았다
 * (2026-09-29 실기기) — 그래서 **글자를 도형으로 구운 PNG**를 마커 이미지로 쓴다(Pretendard SemiBold,
 * 1x/2x/3x, `assets/images/route/`). 앱 언어마다 한 벌이다. 꼬리 끝이 좌표를 가리키므로 anchor는 아래 가운데다.
 */
export const ROUTE_ENDPOINT_LABELS: Record<AppLanguage, EndpointLabelSet> = {
  [AppLanguage.Korean]: {
    start: {
      source: require('@/assets/images/route/route-start-ko.png'),
      width: 46,
      height: 36,
    },
    end: {
      source: require('@/assets/images/route/route-end-ko.png'),
      width: 46,
      height: 36,
    },
  },
  [AppLanguage.English]: {
    start: {
      source: require('@/assets/images/route/route-start-en.png'),
      width: 53,
      height: 36,
    },
    end: {
      source: require('@/assets/images/route/route-end-en.png'),
      width: 59,
      height: 36,
    },
  },
  [AppLanguage.Japanese]: {
    start: {
      source: require('@/assets/images/route/route-start-ja.png'),
      width: 47,
      height: 36,
    },
    end: {
      source: require('@/assets/images/route/route-end-ja.png'),
      width: 48,
      height: 36,
    },
  },
};
