import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform } from 'react-native';
import * as Location from 'expo-location';
import { useFocusEffect } from 'expo-router';
import app from '@/model/app/App';
import { getCurrentPositionWithinTimeout } from '@/model/location/CurrentLocation';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

interface Options {
  // 현재 위치로 카메라를 옮긴다. 줌은 화면이 정한다. useCallback으로 고정해 넘긴다.
  moveCamera: (coordinate: MapCoordinate) => void;
  // 개발자 로그 접두사(어느 화면에서 난 실패인지).
  logTag: string;
}

interface MapCurrentLocation {
  // 위치 권한이 허용돼 있는지. 없으면 내 위치 점을 그리지 않는다.
  granted: boolean;
  // 내 위치 점 좌표(구독 값). 권한이 없거나 아직 한 번도 전달받지 못했으면 `null`.
  currentLocation: MapCoordinate | null;
  // `내 위치` 버튼. 권한이 없으면 여기서 요청하고, 거부된 상태면 설정으로 안내한다.
  moveToCurrentLocation: () => Promise<void>;
}

const CAN_OPEN_SETTINGS = Platform.OS !== 'web';

/**
 * 지도 화면의 현재 위치 처리 (CS-1 · GRP-10 · BD-11) — 박지 지도의 규칙을 그대로 옮긴 공용 훅.
 *
 * - **진입에서 권한을 묻지 않는다.** 현재 상태만 읽는다 — 코스·포인트는 위치 없이도 동작하는
 *   화면이다(GRP-9 엣지 케이스). 요청은 사용자가 `내 위치`를 눌렀을 때만 한다(BD-11).
 * - 권한이 있으면 **포커스 동안 위치를 구독**하고 blur에 해제한다(CS-1). 구독이 provider를 켜
 *   두므로 버튼이 새 fix를 기다리지 않는다 — `model/location/CurrentLocation.ts` 주석 참고.
 *   **버튼을 일회성 요청으로 되돌리지 말 것 — 안드로이드에서 30초 지연이 재발한다.**
 * - 버튼 폴백 사슬: ① 이번 구독 구간의 값 → ② 캐시 → ③ 상한 건 새 fix → 실패 토스트.
 * - 권한이 거부돼 다시 물을 수 없으면 설정으로 안내한다(`gearDetail` 사진 권한과 같은 방식).
 */
export const useMapCurrentLocation = ({
  moveCamera,
  logTag,
}: Options): MapCurrentLocation => {
  const [granted, setGranted] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<MapCoordinate | null>(
    null
  );
  // 버튼 핸들러가 읽는 최신 값 미러 — state를 의존성에 넣으면 위치가 올 때마다 핸들러가 바뀐다.
  const currentLocationRef = useRef<MapCoordinate | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  // 현재 구독을 소유한 포커스 구간의 토큰. await 사이에 blur가 나면 늦게 온 구독을 해제한다(CS-1).
  const watchTokenRef = useRef<object | null>(null);
  // 보관 좌표가 이번 구독 구간에서 전달된 값인지 — 재진입 직후 낡은 좌표로 이동하지 않게(CS-1).
  const isFreshRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    const checkPermission = async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();

        if (mountedRef.current) {
          setGranted(status === 'granted');
        }
      } catch {
        return;
      }
    };

    void checkPermission();

    return () => {
      mountedRef.current = false;
    };
  }, []);

  const updateCurrentLocation = useCallback((next: MapCoordinate) => {
    if (!mountedRef.current) {
      return;
    }

    currentLocationRef.current = next;
    setCurrentLocation(next);
  }, []);

  const stopWatch = useCallback(() => {
    watchTokenRef.current = null;
    watchRef.current?.remove();
    watchRef.current = null;
    isFreshRef.current = false;
  }, []);

  const startWatch = useCallback(
    async (token: object) => {
      watchTokenRef.current = token;
      isFreshRef.current = false;

      try {
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
          next => {
            if (watchTokenRef.current !== token) {
              return;
            }

            isFreshRef.current = true;
            updateCurrentLocation({
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            });
          }
        );

        if (watchTokenRef.current !== token) {
          subscription.remove();

          return;
        }

        watchRef.current = subscription;
      } catch (error) {
        // 구독을 못 열어도(위치 서비스 꺼짐 등) 버튼은 캐시·새 fix로 폴백한다.
        console.warn(`[${logTag}] 현재 위치 구독 실패`, error); // l10n-ignore: 개발자 로그

        if (watchTokenRef.current === token) {
          watchTokenRef.current = null;
        }
      }
    },
    [logTag, updateCurrentLocation]
  );

  // 구독은 포커스 기준이다(CS-1). 권한을 버튼에서 새로 받으면 `granted`가 바뀌어 여기서 시작된다.
  useFocusEffect(
    useCallback(() => {
      if (!granted) {
        return;
      }

      const token = {};

      void startWatch(token);

      return () => {
        stopWatch();
      };
    }, [granted, startWatch, stopWatch])
  );

  const showSettingsGuide = useCallback(() => {
    const l10n = app.getL10n();

    app.getAlertManager()?.show({
      message: l10n.t('app.location.permissionDenied'),
      confirmText: CAN_OPEN_SETTINGS
        ? l10n.t('app.location.openSettings')
        : l10n.t('common.confirm'),
      ...(CAN_OPEN_SETTINGS ? { cancelText: l10n.t('common.cancel') } : {}),
      onConfirm: async () => {
        if (!CAN_OPEN_SETTINGS) {
          return;
        }

        try {
          await Linking.openSettings();
        } catch (error) {
          console.warn(`[${logTag}] 설정 열기 실패`, error); // l10n-ignore: 개발자 로그
        }
      },
    });
  }, [logTag]);

  // 권한 확보. 이미 있으면 바로 true, 물을 수 있으면 묻고, 다시 물을 수 없으면 설정으로 안내한다.
  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await Location.getForegroundPermissionsAsync();

    if (current.status === 'granted') {
      return true;
    }

    if (!current.canAskAgain) {
      showSettingsGuide();

      return false;
    }

    // 방금 시스템 대화상자에서 거절했다면 곧바로 설정 안내를 겹쳐 띄우지 않는다 —
    // 다음에 다시 누를 때(다시 물을 수 없을 때) 안내한다.
    const requested = await Location.requestForegroundPermissionsAsync();

    return requested.status === 'granted';
  }, [showSettingsGuide]);

  const moveToCurrentLocation = useCallback(async () => {
    try {
      if (!(await ensurePermission())) {
        return;
      }

      if (!mountedRef.current) {
        return;
      }

      setGranted(true);

      // ① 이번 구독 구간의 값 — 대부분 이 경로로 끝난다(대기 0).
      const watched = isFreshRef.current ? currentLocationRef.current : null;

      if (watched) {
        moveCamera(watched);

        return;
      }

      // ② 캐시 — 새 fix를 기다리지 않고 즉시 반환된다.
      const lastKnown = await Location.getLastKnownPositionAsync();
      // ③ 마지막 수단으로만 상한을 건 새 fix를 요청한다.
      const position = lastKnown ?? (await getCurrentPositionWithinTimeout());

      if (!mountedRef.current) {
        return;
      }

      if (!position) {
        app
          .getToastManager()
          ?.show({ message: app.getL10n().t('app.location.failed') });

        return;
      }

      const coordinate = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      updateCurrentLocation(coordinate);
      moveCamera(coordinate);
    } catch (error) {
      console.warn(`[${logTag}] 현재 위치 이동 실패`, error); // l10n-ignore: 개발자 로그
      app
        .getToastManager()
        ?.show({ message: app.getL10n().t('app.location.failed') });
    }
  }, [ensurePermission, logTag, moveCamera, updateCurrentLocation]);

  return {
    granted,
    currentLocation: granted ? currentLocation : null,
    moveToCurrentLocation,
  };
};
