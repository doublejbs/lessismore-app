import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import {
  MapCoordinate,
  useMapCurrentLocation,
} from '@/hooks/useMapCurrentLocation';
import {
  CompassHeading,
  getShortestDelta,
  isLowHeadingAccuracy,
  readHeadingDegrees,
} from '@/model/location/CompassHeading';
import MyLocationMode from '@/model/location/MyLocationMode';
import MapCameraChangeReason from '@/model/map/MapCameraChangeReason';

interface Options {
  // 현재 위치로 카메라를 옮긴다(① 단계). 줌은 화면이 정한다. useCallback으로 고정해 넘긴다.
  moveCamera: (coordinate: MapCoordinate) => void;
  // 개발자 로그 접두사(어느 화면에서 난 실패인지).
  logTag: string;
  // 카메라 기록이 아직 없을 때 방향 모드가 쓸 줌.
  fallbackZoom: number;
}

/**
 * 방향 모드가 지도에 요구하는 카메라 — 내 위치 + 고정 줌 + 나침반 방위. 화면(`AppMapView`)은
 * 이 값이 바뀔 때 `animateTo`로 따라간다.
 */
export interface MyLocationFollowCamera {
  latitude: number;
  longitude: number;
  zoom: number;
  tilt: number;
  bearing: number;
}

/**
 * 지도 카메라 변경 알림 — `AppMapView.onCameraChanged`의 `AppMapCameraChange`를 그대로 받는다. 지도
 * 컴포넌트 타입에 묶이지 않게 구조적 타입으로 둔다.
 */
export interface MyLocationCameraChange {
  latitude: number;
  longitude: number;
  zoom?: number | undefined;
  bearing?: number | undefined;
  reason: MapCameraChangeReason | string;
}

interface MyLocationHeadingMode {
  // 위치 권한이 허용돼 있는지(`useMapCurrentLocation`과 같다).
  granted: boolean;
  // 내 위치 점 좌표. 권한이 없거나 아직 모르면 `null`.
  currentLocation: MapCoordinate | null;
  mode: MyLocationMode;
  /**
   * 파란 점에 부채꼴을 그릴 방향. 부채꼴이 켜져 있으면(②로 켜고 ③으로 끌 때까지 — 손으로 지도를 움직여
   * 따라가기가 풀려도 유지) 나침반 값을 준다. 부채꼴이 꺼져 있거나 아직 나침반 값이 없으면 `null`.
   */
  heading: CompassHeading | null;
  /**
   * 방향 모드 동안 지도가 따라갈 카메라(화면이 `animateTo`로 옮긴다). 방향 모드가 아니면 `undefined`다 —
   * 그 동안 카메라는 손·화면의 `animateTo`가 정한다.
   */
  camera: MyLocationFollowCamera | undefined;
  // 따라가기 카메라 이동 시간(ms) — `animateTo`의 `duration`.
  cameraAnimationDuration: number;
  // `내 위치` 버튼. ① 내 위치로 → ② 방향 모드 → ③ 끄기(북쪽 위로)를 돈다.
  handlePressMyLocation: () => Promise<void>;
  // 지도의 `onCameraChanged`에 연결한다. 손이나 지도 나침반 컨트롤로 움직이면 따라가기를 푼다(부채꼴은 유지).
  handleCameraChanged: (camera: MyLocationCameraChange) => void;
  /**
   * 화면이 카메라를 직접 옮기기 전에 부른다(코스 맞춤·끝점·포인트 이동). 따라가기를 풀어
   * 다음 나침반 값이 카메라를 내 위치로 되돌려 놓지 않게 한다. 지도 회전과 부채꼴은 그대로 둔다.
   */
  releaseFollow: () => void;
}

/** 이 각도(도) 미만의 방향 변화는 무시한다 — 손떨림·센서 잡음에 지도가 떨지 않게(BD-11). */
const MIN_HEADING_DELTA = 3;
/** 카메라 갱신 최소 간격(ms) — 초당 최대 약 10회(BD-11). */
const MIN_UPDATE_INTERVAL = 100;
/**
 * 제어 카메라 이동 애니메이션(ms). 갱신 간격보다 조금 길게 잡아 다음 값이 오기 전에 멈추지 않고
 * 이어지게 한다 — 끊긴 계단이 아니라 부드럽게 따라가는 회전으로 보인다.
 */
const CAMERA_ANIMATION_DURATION = 250;

interface CameraSnapshot {
  latitude: number;
  longitude: number;
  zoom: number;
  bearing: number;
}

/**
 * 지도 `내 위치` 버튼의 방향 모드 (BD-11 · GRP-10). 배낭 코스 지도와 그룹 지도가 함께 쓴다.
 *
 * - 현재 위치 처리(권한·구독·폴백 사슬)는 `useMapCurrentLocation`을 그대로 쓴다 — ①은 기존 동작이다.
 * - **회전은 화면이 한다.** 방향 모드 동안 훅은 내 위치·고정 줌·나침반 방위를 담은 `camera`를 내고,
 *   화면은 그 값이 바뀔 때마다 `AppMapView.animateTo`로 따라간다. ③(북쪽 위로 되돌리기)도 화면이
 *   부채꼴이 사라지는 순간을 보고 `animateTo({ bearing: 0 })`로 한다.
 * - **카메라 따라가기와 부채꼴은 따로 간다.** 따라가기(내 위치 고정 + 지도 회전)는 `mode === Heading`
 *   동안만이고, 부채꼴(`isHeadingShown`)은 ②로 켜서 ③으로 끌 때까지 남는다(애플 지도와 같다).
 * - 방향 모드 중 손으로 지도를 움직이면(`reason === 'Gesture'`) 따라가기만 풀고 ① 상태(`Off`)로
 *   돌아간다. **부채꼴과 나침반 구독은 유지한다** — 손을 떼도 내가 바라보는 방향은 계속 보인다.
 *   회전도 그대로 둔다 — 북쪽 위로 되돌리고 부채꼴을 떼는 것은 ③(버튼)만 한다. 그 뒤 버튼은
 *   ① 내 위치로(부채꼴 유지) → ② 방향 모드 → ③ 끄기를 그대로 돈다.
 * - 따라가지 않는 동안 나침반 값은 **부채꼴만 다시 그린다** — 카메라 방위는 `camera`(방향 모드)만
 *   나침반을 쓴다. 부채꼴은 지도에 눕힌(flat) 마커라 지도가 돌아간 채로 남아도 진북 기준 방향을 가리킨다.
 * - 나침반 구독은 **(방향 모드 또는 부채꼴 켜짐) + 화면 포커스 + 앱 활성**일 때만 연다(배터리).
 *   백그라운드에서 돌아오거나 화면에 다시 포커스되면 부채꼴이 그대로면 다시 연다.
 */
export const useMyLocationHeadingMode = ({
  moveCamera,
  logTag,
  fallbackZoom,
}: Options): MyLocationHeadingMode => {
  const { granted, currentLocation, moveToCurrentLocation } =
    useMapCurrentLocation({ moveCamera, logTag });
  const [mode, setMode] = useState(MyLocationMode.Off);
  const [heading, setHeading] = useState<CompassHeading | null>(null);
  // 부채꼴이 켜져 있는지. ②에서 켜고 ③에서만 끈다 — 따라가기가 풀려도(손 이동) 남는다.
  const [isHeadingShown, setIsHeadingShown] = useState(false);
  // 방향 모드에 들어간 순간의 줌·방위. 줌은 방향 모드 동안 고정이다(손으로 바꾸면 모드가 풀린다).
  const [followBase, setFollowBase] = useState<{
    zoom: number;
    bearing: number;
  } | null>(null);
  const [isAppActive, setIsAppActive] = useState(
    AppState.currentState === 'active'
  );
  const isFocused = useIsFocused();
  const lastCameraRef = useRef<CameraSnapshot | null>(null);
  // 마지막으로 지도에 반영한 방향. 3° 미만 변화 무시의 기준이다.
  const appliedHeadingRef = useRef<CompassHeading | null>(null);
  // 간격 제한에 걸려 아직 반영하지 못한 최신 나침반 값.
  const pendingHeadingRef = useRef<{
    degrees: number;
    isLowAccuracy: boolean;
  } | null>(null);
  const lastAppliedAtRef = useRef(0);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setIsAppActive(nextState === 'active');
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const clearThrottle = useCallback(() => {
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }

    pendingHeadingRef.current = null;
  }, []);

  // 쌓인 나침반 값을 지도에 반영한다. 3° 미만 변화는 버린다(정확도 단계가 바뀐 경우는 반영 — 부채꼴 모양이 바뀐다).
  const flushHeading = useCallback(() => {
    throttleTimerRef.current = null;

    const pending = pendingHeadingRef.current;

    pendingHeadingRef.current = null;

    if (!pending || !mountedRef.current) {
      return;
    }

    const applied = appliedHeadingRef.current;
    const delta = applied
      ? getShortestDelta(applied.bearing, pending.degrees)
      : 0;

    if (
      applied &&
      Math.abs(delta) < MIN_HEADING_DELTA &&
      applied.isLowAccuracy === pending.isLowAccuracy
    ) {
      return;
    }

    // 접지 않은 연속값으로 이어 간다 — 359°→1°가 +2°가 되어 카메라가 반대로 한 바퀴 돌지 않는다.
    const next: CompassHeading = {
      bearing: applied ? applied.bearing + delta : pending.degrees,
      isLowAccuracy: pending.isLowAccuracy,
    };

    appliedHeadingRef.current = next;
    lastAppliedAtRef.current = Date.now();
    setHeading(next);
  }, []);

  const handleHeading = useCallback(
    (event: Location.LocationHeadingObject) => {
      const degrees = readHeadingDegrees(event);

      if (degrees === null) {
        return;
      }

      pendingHeadingRef.current = {
        degrees,
        isLowAccuracy: isLowHeadingAccuracy(event),
      };

      if (throttleTimerRef.current) {
        return;
      }

      const wait =
        MIN_UPDATE_INTERVAL - (Date.now() - lastAppliedAtRef.current);

      if (wait <= 0) {
        flushHeading();

        return;
      }

      throttleTimerRef.current = setTimeout(flushHeading, wait);
    },
    [flushHeading]
  );

  // 나침반 구독 — (방향 모드 또는 부채꼴 켜짐) + 포커스 + 앱 활성일 때만(BD-11 배터리).
  const isHeadingActive =
    (mode === MyLocationMode.Heading || isHeadingShown) &&
    isFocused &&
    isAppActive;

  useEffect(() => {
    if (!isHeadingActive) {
      return;
    }

    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    const startWatch = async () => {
      try {
        const next = await Location.watchHeadingAsync(handleHeading);

        if (cancelled) {
          next.remove();

          return;
        }

        subscription = next;
      } catch (error) {
        // 나침반이 없는 기기 등 — 회전 없이 내 위치만 따라간다.
        console.warn(`[${logTag}] 나침반 구독 실패`, error); // l10n-ignore: 개발자 로그
      }
    };

    void startWatch();

    return () => {
      cancelled = true;
      subscription?.remove();
      clearThrottle();
    };
  }, [clearThrottle, handleHeading, isHeadingActive, logTag]);

  // 따라가기만 푼다 — 부채꼴·나침반 구독(`heading`·`appliedHeadingRef`)은 그대로 둔다.
  const releaseFollow = useCallback(() => {
    // 방향 모드가 아니면 같은 값이라 리렌더도 없다.
    setMode(previous =>
      previous === MyLocationMode.Off ? previous : MyLocationMode.Off
    );
    setFollowBase(previous => (previous ? null : previous));
  }, []);

  const enterHeading = useCallback(() => {
    const last = lastCameraRef.current;
    const lastBearing = last?.bearing ?? 0;
    const applied = appliedHeadingRef.current;

    lastAppliedAtRef.current = 0;

    // 부채꼴이 이미 켜져 있으면(손 이동 뒤 다시 ②) 방향을 지금 지도 방위 근처의 연속값으로 옮겨 둔다 —
    // 쌓인 연속값(예 725°)을 그대로 카메라에 넘기면 지도가 여러 바퀴 돌 수 있다. 접은 방향은 같다.
    if (applied) {
      const rebased: CompassHeading = {
        bearing: lastBearing + getShortestDelta(lastBearing, applied.bearing),
        isLowAccuracy: applied.isLowAccuracy,
      };

      appliedHeadingRef.current = rebased;
      setHeading(rebased);
    }

    setFollowBase({
      zoom: last?.zoom ?? fallbackZoom,
      bearing: lastBearing,
    });
    setIsHeadingShown(true);
    setMode(MyLocationMode.Heading);
  }, [fallbackZoom]);

  // ③ 방향 모드 끄기 — 부채꼴을 뗀다(나침반 구독도 멈춘다). 북쪽 위로 되돌리기는 화면이 부채꼴이
  // 사라지는 순간을 보고 한다.
  const resetBearing = useCallback(() => {
    releaseFollow();
    setIsHeadingShown(false);
    setHeading(null);
    appliedHeadingRef.current = null;
    clearThrottle();
  }, [clearThrottle, releaseFollow]);

  const handlePressMyLocation = useCallback(async () => {
    if (mode === MyLocationMode.Heading) {
      resetBearing();

      return;
    }

    if (mode === MyLocationMode.Located && currentLocation) {
      enterHeading();

      return;
    }

    // ① 내 위치로 — 권한 흐름·폴백 사슬은 공용 훅이 맡는다. 옮기지 못했으면 단계를 넘기지 않는다.
    const moved = await moveToCurrentLocation();

    if (!moved || !mountedRef.current) {
      return;
    }

    setMode(MyLocationMode.Located);
  }, [
    currentLocation,
    enterHeading,
    mode,
    moveToCurrentLocation,
    resetBearing,
  ]);

  const handleCameraChanged = useCallback(
    (camera: MyLocationCameraChange) => {
      lastCameraRef.current = {
        latitude: camera.latitude,
        longitude: camera.longitude,
        zoom: camera.zoom ?? fallbackZoom,
        bearing: camera.bearing ?? 0,
      };

      // 손 제스처, 또는 지도 나침반 컨트롤(누르면 북쪽 위로 돌린다 — 회전 중에만 뜬다)이면 따라가기를 푼다.
      if (
        camera.reason === MapCameraChangeReason.Gesture ||
        camera.reason === MapCameraChangeReason.Control
      ) {
        releaseFollow();
      }
    },
    [fallbackZoom, releaseFollow]
  );

  // 카메라 방위에 나침반을 쓰는 곳은 여기(방향 모드)뿐이다. 따라가지 않는 동안에는 `undefined`라
  // 나침반 값이 바뀌어도 카메라는 움직이지 않고 부채꼴만 다시 그린다.
  const camera: MyLocationFollowCamera | undefined =
    mode === MyLocationMode.Heading && currentLocation && followBase
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          zoom: followBase.zoom,
          tilt: 0,
          bearing: heading?.bearing ?? followBase.bearing,
        }
      : undefined;

  return {
    granted,
    currentLocation,
    mode,
    heading: isHeadingShown ? heading : null,
    camera,
    cameraAnimationDuration: CAMERA_ANIMATION_DURATION,
    handlePressMyLocation,
    handleCameraChanged,
    releaseFollow,
  };
};
