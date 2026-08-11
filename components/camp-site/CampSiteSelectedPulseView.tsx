import { FC, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Easing, View } from 'react-native';
import { observer } from 'mobx-react-lite';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { getCampSiteTypeColor } from '@/model/camp-site/CampSiteLabels';

interface Props {
  campSiteMap: CampSiteMap;
}

// CS-2 선택 강조 펄스(A). 마커 탭 시 카메라 이징(B)이 선택 박지를 화면 중앙으로 옮기므로,
// 화면 중앙 고정 오버레이로 두면 좌표 투영 없이 마커와 정렬된다. 선택 변경 시 몇 번 퍼졌다 사라진다.
// 네이버 커스텀 뷰 마커는 정적 비트맵이라 프레임 애니메이션이 안 되므로, 이 RN 오버레이가 시선을 유도한다.
const RING_SIZE = 22;
const PULSE_DURATION = 1100;
const PULSE_ITERATIONS = 3;

const CampSiteSelectedPulseView: FC<Props> = observer(({ campSiteMap }) => {
  const selected = campSiteMap.getSelectedSpot();
  const selectedId = selected?.id ?? null;
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!selectedId) {
      return;
    }

    const animation = Animated.loop(
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 3.2,
          duration: PULSE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: PULSE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
      { iterations: PULSE_ITERATIONS, resetBeforeIteration: true }
    );

    scale.setValue(0.6);
    opacity.setValue(0.5);
    animation.start();

    return () => {
      animation.stop();
    };
  }, [selectedId, scale, opacity]);

  if (!selectedId || !selected) {
    return null;
  }

  return (
    <View style={styles.center} pointerEvents='none'>
      <Animated.View
        style={[
          styles.ring,
          {
            borderColor: getCampSiteTypeColor(selected.type),
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    </View>
  );
});

CampSiteSelectedPulseView.displayName = 'CampSiteSelectedPulseView';

const styles = StyleSheet.create({
  center: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 마커가 각져서 링도 각지게 둔다 — 원형으로 두면 펄스만 형태가 어긋난다(ACG).
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderWidth: 3,
  },
});

export default CampSiteSelectedPulseView;
