import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import type { AppMapAnimateOptions } from '@/components/map/AppMapView';
import {
  CAMERA_MOVE_DURATION,
  CURRENT_LOCATION_ZOOM,
  MIN_BEARING_DELTA,
  NO_CAMERA_PADDING,
} from '@/components/map/MapConstants';
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
  /**
   * 지도 카메라를 옮긴다 — 화면의 `AppMapView` ref 접근 함수(`options => mapRef.current?.animateTo(options)`).
   * useCallback으로 고정해 넘긴다. ① 내 위치로·② 따라가기·③ 북쪽 되돌리기를 훅이 직접 부른다.
   */
  animateTo: (options: AppMapAnimateOptions) => void;
  // 개발자 로그 접두사(어느 화면에서 난 실패인지).
  logTag: string;
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
   * 지금 지도 방위(도) — 내 위치 마커가 부채꼴을 화면 기준으로 보정하는 데 쓴다. **부채꼴이 켜져 있을 때만**
   * 따라가고 1° 미만 변화는 버린다 — 손으로 지도를 돌리는 동안 화면 전체가 프레임마다 리렌더하지 않게.
   */
  mapBearing: number;
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
  bearing: number;
}

/**
 * 지도 `내 위치` 버튼의 방향 모드 (BD-11 · GRP-10). 배낭 코스 지도와 그룹 지도가 함께 쓴다.
 *
 * - 현재 위치 처리(권한·구독·폴백 사슬)는 `useMapCurrentLocation`을 그대로 쓴다 — ①은 기존 동작이다.
 * - **카메라 이동도 훅이 한다** — 화면이 넘긴 `animateTo`로 ① 내 위치로, ② 방향 모드 동안 내 위치 + 나침반
 *   방위 따라가기(줌은 건드리지 않는다), ③ 부채꼴이 사라지는 순간 북쪽 위로 되돌리기를 부른다. 여백은 늘
 *   0으로 명시한다(`NO_CAMERA_PADDING` — 끝점 이동이 남긴 Android 카메라 여백이 중심을 틀지 않게).
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
  animateTo,
  logTag,
}: Options): MyLocationHeadingMode => {
  // ① 내 위치로 — 줌은 `내 위치` 공통 값.
  const moveCamera = useCallback(
    (coordinate: MapCoordinate) => {
      animateTo({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
        zoom: CURRENT_LOCATION_ZOOM,
        duration: CAMERA_MOVE_DURATION,
        padding: NO_CAMERA_PADDING,
      });
    },
    [animateTo]
  );
  const { granted, currentLocation, moveToCurrentLocation } =
    useMapCurrentLocation({ moveCamera, logTag });
  const [mode, setMode] = useState(MyLocationMode.Off);
  const [heading, setHeading] = useState<CompassHeading | null>(null);
  // 부채꼴이 켜져 있는지. ②에서 켜고 ③에서만 끈다 — 따라가기가 풀려도(손 이동) 남는다.
  const [isHeadingShown, setIsHeadingShown] = useState(false);
  // 방향 모드에 들어간 순간의 방위(나침반 값이 오기 전까지 쓴다).
  const [followBase, setFollowBase] = useState<{ bearing: number } | null>(
    null
  );
  const [mapBearing, setMapBearing] = useState(0);
  // `isHeadingShown`의 즉시 값 — 카메라 알림 콜백이 방위를 따라갈지 판단한다(콜백 참조를 고정한 채로).
  const isHeadingShownRef = useRef(false);
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

    setFollowBase({ bearing: lastBearing });
    setMapBearing(lastBearing);
    isHeadingShownRef.current = true;
    setIsHeadingShown(true);
    setMode(MyLocationMode.Heading);
  }, []);

  // ③ 방향 모드 끄기 — 부채꼴을 뗀다(나침반 구독도 멈춘다). 북쪽 위로 되돌리기는 화면이 부채꼴이
  // 사라지는 순간을 보고 한다.
  const resetBearing = useCallback(() => {
    releaseFollow();
    isHeadingShownRef.current = false;
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
      const bearing = camera.bearing ?? 0;

      lastCameraRef.current = {
        latitude: camera.latitude,
        longitude: camera.longitude,
        bearing,
      };

      if (isHeadingShownRef.current) {
        setMapBearing(previous =>
          Math.abs(previous - bearing) < MIN_BEARING_DELTA ? previous : bearing
        );
      }

      // 손 제스처, 또는 지도 나침반 컨트롤(누르면 북쪽 위로 돌린다 — 회전 중에만 뜬다)이면 따라가기를 푼다.
      if (
        camera.reason === MapCameraChangeReason.Gesture ||
        camera.reason === MapCameraChangeReason.Control
      ) {
        releaseFollow();
      }
    },
    [releaseFollow]
  );

  /**
   * ② 방향 모드: 내 위치를 따라가며 바라보는 방향이 위로 오게 지도 방위를 돌린다(BD-11 · GRP-10). 카메라 방위에
   * 나침반을 쓰는 곳은 여기뿐이다 — 따라가지 않는 동안에는 나침반 값이 바뀌어도 부채꼴만 다시 그린다.
   */
  const isFollowing =
    mode === MyLocationMode.Heading && !!currentLocation && !!followBase;
  const followLatitude = isFollowing ? currentLocation?.latitude : undefined;
  const followLongitude = isFollowing ? currentLocation?.longitude : undefined;
  const followBearing = isFollowing
    ? (heading?.bearing ?? followBase?.bearing ?? 0)
    : undefined;

  useEffect(() => {
    if (followLatitude === undefined || followLongitude === undefined) {
      return;
    }

    animateTo({
      latitude: followLatitude,
      longitude: followLongitude,
      bearing: followBearing ?? 0,
      duration: CAMERA_ANIMATION_DURATION,
      padding: NO_CAMERA_PADDING,
    });
  }, [animateTo, followBearing, followLatitude, followLongitude]);

  // ③ 방향 모드 끄기 — 부채꼴이 사라지는 순간 지도를 북쪽 위로 되돌린다.
  const wasHeadingShownRef = useRef(isHeadingShown);

  useEffect(() => {
    const wasShown = wasHeadingShownRef.current;

    wasHeadingShownRef.current = isHeadingShown;

    if (!wasShown || isHeadingShown) {
      return;
    }

    const last = lastCameraRef.current;

    if (!last) {
      return;
    }

    animateTo({
      latitude: last.latitude,
      longitude: last.longitude,
      bearing: 0,
      duration: CAMERA_MOVE_DURATION,
      padding: NO_CAMERA_PADDING,
    });
  }, [animateTo, isHeadingShown]);

  return {
    granted,
    currentLocation,
    mode,
    heading: isHeadingShown ? heading : null,
    mapBearing,
    handlePressMyLocation,
    handleCameraChanged,
    releaseFollow,
  };
};
