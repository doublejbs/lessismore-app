import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { useIsFocused } from 'expo-router';
import { Camera, CameraChangeReason } from '@mj-studio/react-native-naver-map';
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

interface Options {
  // 현재 위치로 카메라를 옮긴다(① 단계). 줌은 화면이 정한다. useCallback으로 고정해 넘긴다.
  moveCamera: (coordinate: MapCoordinate) => void;
  // 개발자 로그 접두사(어느 화면에서 난 실패인지).
  logTag: string;
  // 카메라 기록이 아직 없을 때 방향 모드가 쓸 줌.
  fallbackZoom: number;
}

interface MyLocationHeadingMode {
  // 위치 권한이 허용돼 있는지(`useMapCurrentLocation`과 같다).
  granted: boolean;
  // 내 위치 점 좌표. 권한이 없거나 아직 모르면 `null`.
  currentLocation: MapCoordinate | null;
  mode: MyLocationMode;
  // 방향 모드에서 부채꼴을 그릴 방향. 방향 모드가 아니거나 아직 나침반 값이 없으면 `null`.
  heading: CompassHeading | null;
  /**
   * 지도에 넘길 제어 카메라(`NaverMapView`의 `camera` prop). 방향 모드를 한 번도 쓰지 않았으면
   * `undefined`다. 방향 모드 동안 내 위치·방위를 따라가고, 모드가 끝나면 **마지막 값 그대로 얼려 둔다**
   * (같은 값이면 네이티브로 다시 보내지 않으므로 손·`animateCameraTo`의 이동을 막지 않는다).
   * **한 번 값을 넘긴 뒤에는 `undefined`로 되돌리지 않는다** — 아래 훅 주석 참고.
   */
  camera: Camera | undefined;
  // `NaverMapView`의 `animationDuration` — `camera` prop 변경에만 적용된다.
  cameraAnimationDuration: number;
  // `내 위치` 버튼. ① 내 위치로 → ② 방향 모드 → ③ 끄기(북쪽 위로)를 돈다.
  handlePressMyLocation: () => Promise<void>;
  // `NaverMapView`의 `onCameraChanged`에 연결한다. 손이나 지도 나침반 컨트롤로 움직이면 따라가기를 푼다.
  handleCameraChanged: (
    camera: Camera & { reason: CameraChangeReason }
  ) => void;
  /**
   * 화면이 카메라를 직접 옮기기 전에 부른다(코스 맞춤·끝점·포인트 이동). 따라가기를 풀어
   * 다음 나침반 값이 카메라를 내 위치로 되돌려 놓지 않게 한다. 지도 회전은 그대로 둔다.
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
 * - **회전은 `camera` prop으로 한다.** `@mj-studio/react-native-naver-map@2.9.0`의
 *   `animateCameraTo`는 방위(bearing)를 받지 않는다(네이티브 명령에 인자가 없다). 반면 `camera`
 *   prop은 위경도·줌·기울기·방위를 모두 받고 `animationDuration`으로 애니메이션한다 — 네이티브
 *   변경 없이(OTA로) 쓸 수 있는 유일한 회전 경로다. 방향 모드 동안 이 prop으로 따라가고, 모드가
 *   끝나면 **마지막으로 넘긴 값을 그대로 얼려 둔다.** 값이 바뀌지 않으면 네이티브로 다시 보내지 않으므로
 *   (JS 프롭 diff·iOS `isCameraEqual`) 손 제스처와 화면의 `animateCameraTo`/`animateRegionTo`가 그대로
 *   동작한다. (`camera` prop은 줌이 없으면 10으로 채워지므로 줌을 항상 함께 넘긴다.)
 * - **한 번 넘긴 `camera`를 `undefined`로 되돌리지 말 것.** iOS(Fabric)는 prop이 빠지면 코드젠 기본
 *   구조체(위경도·줌 0)를 받는데, 라이브러리의 유효성 검사는 -123123123만 무효로 보므로 0을 유효한
 *   카메라로 적용해 **지도가 0°,0°(대서양)로 튄다**(2026-10-03 실기기 — 방향 모드 중 드래그하면 이상한
 *   곳으로 이동). 안드로이드는 null을 무시해 재현되지 않는다. `RNCNaverMapView.mm` `updateProps` 참고.
 * - 나침반 구독은 **방향 모드 + 화면 포커스 + 앱 활성**일 때만 연다(배터리). 백그라운드에서 돌아오거나
 *   화면에 다시 포커스되면 방향 모드가 그대로면 다시 연다.
 * - 방향 모드 중 손으로 지도를 움직이면(`reason === 'Gesture'`) 따라가기를 풀고 ① 상태(`Off`)로
 *   돌아간다. 부채꼴도 뗀다. 회전은 그대로 둔다 — 북쪽 위로 되돌리는 것은 ③(버튼)만 한다.
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
  // 방향 모드에 들어간 순간의 줌·방위. 줌은 방향 모드 동안 고정이다(손으로 바꾸면 모드가 풀린다).
  const [followBase, setFollowBase] = useState<{
    zoom: number;
    bearing: number;
  } | null>(null);
  // 방향 모드가 아닐 때 넘기는 얼린 카메라 — 마지막으로 넘긴 값(따라가기를 푼 순간) 또는 ③의 북쪽 위 카메라.
  const [frozenCamera, setFrozenCamera] = useState<Camera | null>(null);
  // 마지막 커밋에서 지도에 넘긴 `camera` prop. 따라가기를 풀 때 이 값을 그대로 얼린다.
  const emittedCameraRef = useRef<Camera | null>(null);
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

  // 나침반 구독 — 방향 모드 + 포커스 + 앱 활성일 때만(BD-11 배터리).
  const isHeadingActive =
    mode === MyLocationMode.Heading && isFocused && isAppActive;

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

  /**
   * 지금 지도에 넘겨 둔 `camera` prop을 그대로 얼린다. 값이 같으면 네이티브로 다시 보내지 않으므로
   * 지도는 손·애니메이션이 둔 자리에 그대로 머문다(따라가기만 끊긴다).
   */
  const freezeEmittedCamera = useCallback(() => {
    const emitted = emittedCameraRef.current;

    if (emitted) {
      setFrozenCamera(emitted);
    }
  }, []);

  const releaseFollow = useCallback(() => {
    // 방향 모드가 아니면(이미 얼어 있거나 한 번도 안 썼으면) 같은 값이라 리렌더도 없다.
    freezeEmittedCamera();
    setMode(previous =>
      previous === MyLocationMode.Off ? previous : MyLocationMode.Off
    );
    setHeading(previous => (previous ? null : previous));
    setFollowBase(previous => (previous ? null : previous));
    appliedHeadingRef.current = null;
    clearThrottle();
  }, [clearThrottle, freezeEmittedCamera]);

  const enterHeading = useCallback(() => {
    const last = lastCameraRef.current;

    appliedHeadingRef.current = null;
    lastAppliedAtRef.current = 0;
    setFollowBase({
      zoom: last?.zoom ?? fallbackZoom,
      bearing: last?.bearing ?? 0,
    });
    setHeading(null);
    setMode(MyLocationMode.Heading);
  }, [fallbackZoom]);

  // ③ 방향 모드 끄기 — 지도를 북쪽 위로 되돌리고 부채꼴을 뗀다.
  const resetBearing = useCallback(() => {
    const last = lastCameraRef.current;
    const center = last ?? currentLocation;

    releaseFollow();

    if (!center) {
      return;
    }

    // 이 값은 계속 얼려 둔다 — `undefined`로 놓지 않는다(훅 주석: iOS가 0°,0°로 이동한다).
    setFrozenCamera({
      latitude: center.latitude,
      longitude: center.longitude,
      zoom: last?.zoom ?? fallbackZoom,
      tilt: 0,
      bearing: 0,
    });
  }, [currentLocation, fallbackZoom, releaseFollow]);

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
    (camera: Camera & { reason: CameraChangeReason }) => {
      lastCameraRef.current = {
        latitude: camera.latitude,
        longitude: camera.longitude,
        zoom: camera.zoom ?? fallbackZoom,
        bearing: camera.bearing ?? 0,
      };

      // 손 제스처, 또는 지도 나침반 컨트롤(누르면 북쪽 위로 돌린다 — 회전 중에만 뜬다)이면 따라가기를 푼다.
      if (camera.reason === 'Gesture' || camera.reason === 'Control') {
        releaseFollow();
      }
    },
    [fallbackZoom, releaseFollow]
  );

  const followCamera: Camera | undefined =
    mode === MyLocationMode.Heading && currentLocation && followBase
      ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          zoom: followBase.zoom,
          tilt: 0,
          bearing: heading?.bearing ?? followBase.bearing,
        }
      : undefined;
  const camera = followCamera ?? frozenCamera ?? undefined;

  // 커밋된 `camera` prop을 기억한다 — 따라가기를 풀 때 이 값을 그대로 얼린다(`freezeEmittedCamera`).
  useEffect(() => {
    emittedCameraRef.current = camera ?? null;
  }, [camera]);

  return {
    granted,
    currentLocation,
    mode,
    heading: mode === MyLocationMode.Heading ? heading : null,
    camera,
    cameraAnimationDuration: CAMERA_ANIMATION_DURATION,
    handlePressMyLocation,
    handleCameraChanged,
    releaseFollow,
  };
};
