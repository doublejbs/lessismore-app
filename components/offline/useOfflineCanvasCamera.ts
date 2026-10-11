import { useCallback, useMemo, useState } from 'react';
import { LayoutChangeEvent } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  CanvasCamera,
  CanvasPoint,
  CanvasSize,
  fromScreen,
} from '@/model/offline/OfflineCanvasProjection';

// 확대 한계(px/m). 아래는 남한 전역이 한 화면, 위는 골목 수준 — 지도 줌 범위와 비슷하게 둔다.
const MIN_SCALE = 0.0002;
const MAX_SCALE = 4;

const INITIAL_CAMERA: CanvasCamera = {
  center: { x: 0, y: 0 },
  scale: 0.002,
  rotation: 0,
};

const clampScale = (scale: number) =>
  Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));

interface Options {
  // 사용자가 손으로 옮기거나 확대하기 시작했다(방향 모드의 따라가기를 푼다 — BD-11과 같다).
  onUserGesture: () => void;
  // 빈 곳을 눌렀다(카드를 닫는다).
  onTap: () => void;
}

/**
 * 오프라인 코스 캔버스의 카메라와 제스처 (OF-6). 지도와 같은 제스처 — 한 손가락 드래그로 이동,
 * 두 손가락 핀치로 초점 중심 확대·축소(`react-native-gesture-handler`). 카메라는 평면 좌표(m) 기준이다.
 */
const useOfflineCanvasCamera = ({ onUserGesture, onTap }: Options) => {
  const [size, setSize] = useState<CanvasSize | null>(null);
  const [camera, setCamera] = useState<CanvasCamera>(INITIAL_CAMERA);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    setSize(previous =>
      previous && previous.width === width && previous.height === height
        ? previous
        : { width, height }
    );
  }, []);

  // 크기·핸들러가 바뀔 때만 다시 만든다(화면 회전 정도) — 핸들러는 호출자가 useCallback으로 고정해 넘긴다.
  const gesture = useMemo(() => {
    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(4)
      .onStart(() => {
        onUserGesture();
      })
      .onChange(event => {
        setCamera(previous => {
          const radians = (-previous.rotation * Math.PI) / 180;
          const dx = event.changeX / previous.scale;
          const dy = event.changeY / previous.scale;

          return {
            ...previous,
            center: {
              x:
                previous.center.x -
                (dx * Math.cos(radians) - dy * Math.sin(radians)),
              y:
                previous.center.y -
                (dx * Math.sin(radians) + dy * Math.cos(radians)),
            },
          };
        });
      });

    const pinch = Gesture.Pinch()
      .runOnJS(true)
      .onStart(() => {
        onUserGesture();
      })
      .onChange(event => {
        if (!size) {
          return;
        }

        setCamera(previous => {
          const focal: CanvasPoint = { x: event.focalX, y: event.focalY };
          const anchor = fromScreen(focal, previous, size);
          const next = {
            ...previous,
            scale: clampScale(previous.scale * event.scaleChange),
          };
          const moved = fromScreen(focal, next, size);

          // 손가락 사이의 점이 그 자리에 머물도록 중심을 옮긴다(지도 핀치와 같은 느낌).
          return {
            ...next,
            center: {
              x: next.center.x + (anchor.x - moved.x),
              y: next.center.y + (anchor.y - moved.y),
            },
          };
        });
      });

    const tap = Gesture.Tap()
      .runOnJS(true)
      .onEnd((_event, success) => {
        if (success) {
          onTap();
        }
      });

    return Gesture.Simultaneous(pan, pinch, tap);
  }, [onTap, onUserGesture, size]);

  return { size, camera, setCamera, gesture, handleLayout };
};

export default useOfflineCanvasCamera;
