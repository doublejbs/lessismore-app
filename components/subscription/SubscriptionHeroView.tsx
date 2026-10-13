import { createElement, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createMapLibreViewLoader } from '@/components/map/MapLibreViewLoader';
import { Acg, Spacing } from '@/constants/DesignTokens';
import {
  hasHeroRealRoute,
  SubscriptionHeroContent,
} from '@/model/subscription/SubscriptionHeroContent';
import SubscriptionCloseButtonView from './SubscriptionCloseButtonView';
import SubscriptionHeroExampleRouteView from './SubscriptionHeroExampleRouteView';
import type SubscriptionHeroMapViewType from './SubscriptionHeroMapView';

// SUB-2: 히어로 높이 = 화면 높이의 38%.
const HERO_HEIGHT_RATIO = 0.38;

// 아래쪽 1/3을 순백으로 페이드해 지면과 잇는다.
const HERO_FADE_RATIO = 1 / 3;
const HERO_FADE_COLORS = ['rgba(255,255,255,0)', Acg.paper] as const;

// 닫기 ×를 화면 모서리에서 띄우는 거리(44pt 원의 바깥 여백).
const CLOSE_BUTTON_EDGE_INSET = 16;

// 지도 본문은 MapLibre SDK를 최상위 import한다 — 옛 바이너리에서 import만으로 터지지 않게 쓸 때 싣는다(MAP-1).
const loadHeroMapView = createMapLibreViewLoader<
  typeof SubscriptionHeroMapViewType
>(
  'SubscriptionHeroMapView',
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('./SubscriptionHeroMapView') as {
      default: typeof SubscriptionHeroMapViewType;
    }).default
);

interface Props {
  // null이면 아직 조회 중 — 연회색 면만 그린다.
  content: SubscriptionHeroContent | null;
  isCloseDisabled: boolean;
  onClose: () => void;
}

/**
 * SUB-2 ① 히어로 — 화면 폭 전체 비대화형 지도(MAP-2) 위 코스 UI + 아래 1/3 순백 페이드 + 좌상단 닫기 ×.
 *
 * - 다가오는 여행에 코스가 있으면 지도에 그 코스(선·출발/도착·포인트)를 그린다(`SubscriptionHeroMapView`).
 * - 코스가 없으면 여행지(없으면 북한산) 중심 지도 위에 **예시 코스** SVG 일러스트를 얹는다.
 * - 지도를 못 그리면(옛 바이너리·웹·로드 실패) 연회색 면만 남고, 그 위에 예시 코스를 그린다 — 실제 코스는
 *   지도 레이어라 지도 없이 그릴 수 없다.
 * - 라임은 두지 않는다(화면의 라임은 하단 주 액션 알약 하나 — HM-8). 출처는 지도 자체의 ⓘ가 맡는다.
 */
const SubscriptionHeroView = ({ content, isCloseDisabled, onClose }: Props) => {
  const { width, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [isMapFailed, setIsMapFailed] = useState(false);
  const height = Math.round(windowHeight * HERO_HEIGHT_RATIO);
  const fadeHeight = Math.round(height * HERO_FADE_RATIO);
  // 실린 컴포넌트는 모듈 캐시라 렌더마다 같은 참조다(새로 만들지 않는다 — 지도 상태가 초기화되지 않는다).
  const heroMapView = content && !isMapFailed ? loadHeroMapView() : null;
  const isExample =
    content !== null && (!hasHeroRealRoute(content) || heroMapView === null);

  const handleMapLoadFailed = () => {
    setIsMapFailed(true);
  };

  return (
    <View style={[styles.hero, { height }]}>
      {content && heroMapView
        ? createElement(heroMapView, {
            content,
            height,
            fadeHeight,
            topInset: insets.top,
            onLoadFailed: handleMapLoadFailed,
          })
        : null}

      {isExample ? (
        <SubscriptionHeroExampleRouteView width={width} height={height} />
      ) : null}

      <LinearGradient
        colors={HERO_FADE_COLORS}
        style={[styles.fade, { height: fadeHeight }]}
        pointerEvents='none'
      />

      <View
        style={[
          styles.closeSlot,
          { top: insets.top + Spacing.item / 2, left: CLOSE_BUTTON_EDGE_INSET },
        ]}
      >
        <SubscriptionCloseButtonView
          isFloating={true}
          disabled={isCloseDisabled}
          onClose={onClose}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // 바탕은 연회색 면 — 지도가 그 위에 뜬다(조회 중·지도 없음이면 이 면만 남는다).
  hero: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: Acg.controlFill,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  closeSlot: {
    position: 'absolute',
  },
});

export default observer(SubscriptionHeroView);
