import { FC } from 'react';
import { NaverMapMarkerOverlay } from '@mj-studio/react-native-naver-map';
import { observer } from 'mobx-react-lite';
import { RouteDisplay } from '@/model/route/RouteDisplay';
import AppLanguage from '@/model/l10n/AppLanguage';
import app from '@/model/app/App';

interface Props {
  /**
   * 시작·끝을 표시할 코스 — **선택된 코스 하나**다. 여러 코스를 그릴 때 옅게 그린 코스에까지
   * 마커를 달면 코스 수 × 2개의 마커가 지도를 덮고, 어느 끝이 어느 선의 것인지도 읽히지 않는다.
   */
  route: RouteDisplay | null;
}

interface EndpointLabelImage {
  source: number;
  // 이미지 크기(pt). 글자 폭이 언어마다 달라 이미지마다 다르다.
  width: number;
  height: number;
}

interface EndpointLabelSet {
  start: EndpointLabelImage;
  end: EndpointLabelImage;
}

// `출발`·`도착` 말풍선 라벨. 커스텀 View 마커는 네이버 지도가 스냅숏으로 굳히면서 글자·아이콘
// 글꼴이 빠진 채 도형만 남았다(2026-09-29 실기기) — 그래서 **글자를 도형으로 구운 PNG**를 마커
// 이미지로 쓴다(Pretendard SemiBold, 1x/2x/3x, `assets/images/route/`). 앱 언어마다 한 벌이다.
// 꼬리 끝이 좌표를 가리키므로 anchor는 아래 가운데다.
const ENDPOINT_LABELS: Record<AppLanguage, EndpointLabelSet> = {
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

const LABEL_ANCHOR = { x: 0.5, y: 1 };

/**
 * 코스 시작·끝 마커 (GRP-8, BD-11). 그룹 지도와 배낭 코스 화면이 **같은 마커**를 쓴다.
 *
 * 방향이 지도에 보이지 않으면 뒤집기가 그래프에만 반영되고 지도에는 아무 변화가 없다 —
 * 그래서 양끝을 표시하고, 뒤집으면 두 마커의 자리가 바뀐다(뒤집힌 좌표의 첫 점이 시작이다).
 *
 * **글자와 면으로 가른다(색각 이상 대응)**: 시작 = 잉크 말풍선 + 흰 `출발`, 끝 = 흰 말풍선 + 잉크 테두리·`도착`.
 * 지도 위의 다른 표식은 전부 원이다 — 등록 포인트(유형 색 원 + 아이콘), 훑기 마커(흰 원 + 잉크 점),
 * 조준 마커(빈 원 + 조준선), 내 위치(파란 점) — 그래서 두 끝점은 원이 아닌 말풍선이다.
 * 라임은 쓰지 않는다(화면의 주 액션 `포인트 추가`가 라임이다, HM-8).
 */
const RouteEndpointMarkersView: FC<Props> = ({ route }) => {
  const coordinates = route?.getSimplified() ?? [];

  if (!route || coordinates.length < 2) {
    return null;
  }

  const labels = ENDPOINT_LABELS[app.getL10n().language];
  const start = coordinates[0];
  const end = coordinates[coordinates.length - 1];
  // 방향이 바뀌면 마커를 새로 붙인다 — 같은 키로 좌표만 바꾸면 이전 자리에 남는 경우가 있다.
  const keyPrefix = `${route.getId()}:${route.isReversed() ? 'r' : 'f'}`;

  return (
    <>
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:end`}
        latitude={end.lat}
        longitude={end.lng}
        anchor={LABEL_ANCHOR}
        width={labels.end.width}
        height={labels.end.height}
        image={labels.end.source}
        // 폴리라인 위, 훑기 마커(2)·포인트 아래. 순환 코스라 두 끝이 겹치면 시작이 위다.
        zIndex={1}
      />
      <NaverMapMarkerOverlay
        key={`${keyPrefix}:start`}
        latitude={start.lat}
        longitude={start.lng}
        anchor={LABEL_ANCHOR}
        width={labels.start.width}
        height={labels.start.height}
        image={labels.start.source}
        zIndex={1}
      />
    </>
  );
};

export default observer(RouteEndpointMarkersView);
