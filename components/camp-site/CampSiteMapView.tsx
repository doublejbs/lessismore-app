import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, Platform, StyleSheet, View } from 'react-native';
import {
  NaverMapView,
  NaverMapViewRef,
  Camera,
  CameraChangeReason,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import { Acg } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import LocalStorageManager from '@/model/storage/LocalStorageManager';
import { deltaToZoom } from '@/model/map/MapZoom';
import {
  CURRENT_LOCATION_FAILED_MESSAGE,
  getCurrentPositionWithinTimeout,
} from '@/model/location/CurrentLocation';
import {
  isCampSiteDetailSheetOpen,
  setCampSiteDetailSheet,
} from '@/model/camp-site/CampSiteDetailSheetHandoff';
import { setCampSiteFavoritesSheet } from '@/model/camp-site/CampSiteFavoritesHandoff';
import CampSiteMapMarkersView, {
  CampSiteMapViewport,
} from './CampSiteMapMarkersView';
import CampSiteMyLocationMarkerView from './CampSiteMyLocationMarkerView';
import CampSiteSelectedPulseView from './CampSiteSelectedPulseView';
import CampSiteMapTopOverlayView from './CampSiteMapTopOverlayView';
import CampSiteMapBottomOverlayView from './CampSiteMapBottomOverlayView';
import {
  clearPendingCampSite,
  getPendingCampSite,
} from '@/model/camp-site/CampSiteMapHandoff';

interface Props {
  campSiteMap: CampSiteMap;
}

interface CameraTarget {
  latitude: number;
  longitude: number;
  zoom: number;
  duration: number;
}

interface CameraRegionTarget {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  duration: number;
}

// 남한 전역이 보이는 폴백 카메라(위치 권한 거부/미결정 시).
// 중심=남한 중앙, 줌=기존 latitudeDelta 4.8 등가(iPhone 세로 ~850dp 기준 zoom ≈ 8).
const KOREA_CAMERA: Camera = {
  latitude: 36.2,
  longitude: 127.9,
  zoom: deltaToZoom(4.8),
};

const KOREA_LATITUDE_DELTA = 4.8;

// 최초 진입 1회 규제 고지(CS-4) 표시 여부 저장 키.
const NOTICE_STORAGE_KEY = 'campSiteNoticeShown';

// iOS 네이티브 탭바(리퀴드 글래스)는 풀블리드 지도 위에 떠 있으므로
// 하단 플로팅 요소는 탭바 높이만큼 띄운다. Android JS 탭바는 레이아웃 공간을 차지해 불필요.
const TAB_BAR_HEIGHT = 49;

// 박지 지도 화면(CS-1/CS-2/CS-6)의 조립 컴포넌트. 지도(카메라·권한)만 직접 다루고,
// MobX 상태를 읽는 UI는 마커 레이어·상단(검색/칩) observer로 분리했다 —
// 검색 타이핑·카메라 이동이 서로(특히 마커 레이어)를 리렌더하지 않게 하기 위함.
const CampSiteMapView: FC<Props> = ({ campSiteMap }) => {
  const router = useRouter();
  const mapRef = useRef<NaverMapViewRef>(null);
  const [locationGranted, setLocationGranted] = useState(false);
  // 내 위치 파란 점 좌표. 네이티브 위치 오버레이는 줌 드리프트 버그가 있어 쓰지 않고,
  // 이 좌표를 지오 앵커 마커(CampSiteMyLocationMarkerView)로 직접 렌더한다(CS-1).
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  // 구독 좌표의 최신 값 미러. 현재 위치 버튼 핸들러가 이 값을 읽는데,
  // state를 useCallback 의존성에 넣으면 위치가 갱신될 때마다 핸들러 참조가 바뀌어
  // 하단 오버레이까지 리렌더된다(이 화면은 참조 고정을 전제로 레이어를 분리해 뒀다).
  const currentLocationRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  // 현재 구독을 소유한 포커스 구간의 토큰. 구독을 여는 즉시(await 이전에) 채워 두므로
  // await 사이에 blur가 나면 토큰이 어긋나고, 늦게 도착한 구독을 그 자리에서 해제할 수 있다.
  const locationWatchTokenRef = useRef<object | null>(null);
  // 보관 중인 좌표가 **이번 구독 구간에서** 전달된 값인지(CS-1). 구독을 새로 열 때 false가
  // 되고 첫 전달에 true가 된다. 탭을 벗어난 동안 사용자가 이동했을 수 있어, 재진입 직후에는
  // 현재 위치 버튼이 이전 좌표를 1순위로 쓰지 않게 하는 판단 근거다.
  const isWatchedPositionFreshRef = useRef(false);
  const mountedRef = useRef(true);
  // 사용자가 직접(제스처로) 지도를 움직였는지. 뒤늦게 도착한 초기 위치가
  // 사용자의 조작을 덮어쓰지 않게 하는 가드(CS-1).
  const userMovedCameraRef = useRef(false);
  // 지도 초기화 완료 여부 — 대기 중이던 카메라 이동을 초기화 후에만 flush한다.
  const mapReadyRef = useRef(false);
  const pendingCameraTargetRef = useRef<CameraTarget | null>(null);
  const pendingCameraRegionRef = useRef<CameraRegionTarget | null>(null);
  const pendingCameraFrameRef = useRef<number | null>(null);
  // 현재 줌(마커 탭 시 줌은 유지한 채 그 박지를 중앙으로 이징하기 위함).
  const zoomRef = useRef<number>(deltaToZoom(0.2));
  const spotsLoading = campSiteMap.isLoading();
  const insets = useSafeAreaInsets();

  // 하단 플로팅 요소(현재 위치 버튼)가 iOS 플로팅 탭바에 가리지 않게 하는 여유.
  const bottomClearance =
    Platform.OS === 'ios' ? insets.bottom + TAB_BAR_HEIGHT : 0;

  // 마커 레이어용 뷰포트. onCameraChanged는 이동 중 연속 발화하므로
  // 값을 양자화해 실질 변화가 있을 때만 리렌더되게 한다.
  const [viewport, setViewport] = useState<CampSiteMapViewport | null>(null);

  // 파란 점 좌표를 state와 ref에 함께 반영한다(ref는 버튼 핸들러가 읽는 최신 값).
  const updateCurrentLocation = useCallback(
    (next: { latitude: number; longitude: number }) => {
      if (!mountedRef.current) {
        return;
      }

      currentLocationRef.current = next;
      setCurrentLocation(next);
    },
    []
  );

  // 위치 구독을 닫는다(CS-1). blur·언마운트에서 호출한다.
  // 여행지 선택기(useBagDestinationPickerState, DST-3)는 같은 자리에서 보관 좌표까지
  // 비우지만 지도 탭은 **의도적으로 좌표를 유지**한다 — 파란 점이 좌표를 그리고 있어서
  // 탭을 오갈 때마다 비우면 점이 사라졌다 나타나는 깜빡임이 된다(선택기는 좌표를 화면에
  // 그리지 않아 비워도 보이는 변화가 없다). 대신 신선도 플래그만 내려 현재 위치 버튼이
  // 낡은 좌표를 1순위로 쓰지 않게 한다.
  const stopLocationWatch = useCallback(() => {
    locationWatchTokenRef.current = null;
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    isWatchedPositionFreshRef.current = false;
  }, []);

  // 내 위치 파란 점을 이후 이동에도 갱신한다(카메라는 따라가지 않음 = 기존 NoFollow와 동일).
  // watchToken은 이번 포커스 구간의 식별자다 — 구독이 열리기까지 await가 있어 그 사이에
  // blur가 나면 토큰이 어긋나고, 늦게 도착한 구독을 여기서 해제한다.
  const startLocationWatch = useCallback(
    async (watchToken: object) => {
      // 소유권을 await 이전에 잡는다 — 이 시점 이후 시작되는 구독이 앞선 시도를 무효화하므로
      // 포커스가 여러 번 발생해도 살아남는 구독은 항상 하나뿐이다.
      locationWatchTokenRef.current = watchToken;
      isWatchedPositionFreshRef.current = false;

      try {
        const subscription = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
          next => {
            // 해제 직전에 도착한 전달이 낡은 좌표를 "신선"으로 표시하지 않게 한다.
            if (locationWatchTokenRef.current !== watchToken) {
              return;
            }

            isWatchedPositionFreshRef.current = true;

            updateCurrentLocation({
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            });
          }
        );

        // await 사이에 blur/언마운트됐으면 여기가 이 구독의 유일한 해제 지점이다.
        if (locationWatchTokenRef.current !== watchToken) {
          subscription.remove();

          return;
        }

        locationWatchRef.current = subscription;
      } catch (error) {
        // 구독을 못 열어도(위치 서비스 꺼짐 등) 버튼은 캐시·새 fix로 폴백하므로 화면은 살아 있다.
        console.error('현재 위치 구독 실패:', error);

        if (locationWatchTokenRef.current === watchToken) {
          locationWatchTokenRef.current = null;
        }
      }
    },
    [updateCurrentLocation]
  );

  const flushPendingCamera = useCallback(() => {
    if (
      pendingCameraFrameRef.current !== null ||
      (!pendingCameraTargetRef.current && !pendingCameraRegionRef.current)
    ) {
      return;
    }

    pendingCameraFrameRef.current = requestAnimationFrame(() => {
      pendingCameraFrameRef.current = null;

      if (!mountedRef.current || !mapReadyRef.current || !mapRef.current) {
        return;
      }

      const target = pendingCameraTargetRef.current;
      const region = pendingCameraRegionRef.current;

      if (!target && !region) {
        return;
      }

      pendingCameraTargetRef.current = null;
      pendingCameraRegionRef.current = null;

      if (target) {
        mapRef.current.animateCameraTo(target);
      } else if (region) {
        mapRef.current.animateRegionTo(region);
      }
    });
  }, []);

  const moveCamera = useCallback(
    (target: CameraTarget) => {
      if (!mountedRef.current) {
        return;
      }

      if (
        !mapReadyRef.current ||
        !mapRef.current ||
        pendingCameraFrameRef.current !== null
      ) {
        pendingCameraTargetRef.current = target;
        pendingCameraRegionRef.current = null;

        if (mapReadyRef.current) {
          flushPendingCamera();
        }

        return;
      }

      pendingCameraTargetRef.current = null;
      pendingCameraRegionRef.current = null;
      mapRef.current.animateCameraTo(target);
    },
    [flushPendingCamera]
  );

  const moveCameraToRegion = useCallback(
    (region: CameraRegionTarget) => {
      if (!mountedRef.current) {
        return;
      }

      if (
        !mapReadyRef.current ||
        !mapRef.current ||
        pendingCameraFrameRef.current !== null
      ) {
        pendingCameraTargetRef.current = null;
        pendingCameraRegionRef.current = region;

        if (mapReadyRef.current) {
          flushPendingCamera();
        }

        return;
      }

      pendingCameraTargetRef.current = null;
      pendingCameraRegionRef.current = null;
      mapRef.current.animateRegionTo(region);
    },
    [flushPendingCamera]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      mapReadyRef.current = false;
      pendingCameraTargetRef.current = null;
      pendingCameraRegionRef.current = null;

      if (pendingCameraFrameRef.current !== null) {
        cancelAnimationFrame(pendingCameraFrameRef.current);
        pendingCameraFrameRef.current = null;
      }

      // 포커스 상태에서 언마운트되면 useFocusEffect 정리가 돌지만, 포커스를 잃은 뒤
      // 언마운트되는 경로까지 포함해 구독이 반드시 닫히도록 여기서도 해제한다(멱등).
      stopLocationWatch();
    };
  }, [stopLocationWatch]);

  // 지도 최초 진입 시 위치 권한 요청 → 허용 시 현재 위치로 카메라 이동(CS-1).
  // **권한 요청과 초기 카메라 이동은 여기서 1회만** 한다 — 이것까지 포커스에 묶으면
  // 탭을 오갈 때마다 카메라가 현재 위치로 되돌아가 사용자가 옮겨 둔 화면이 초기화된다.
  // 반대로 위치 **구독**은 아래 useFocusEffect가 포커스 기준으로 관리한다.
  useEffect(() => {
    let cancelled = false;

    // 초기 카메라 적용. 사용자가 이미 지도를 움직였으면 카메라는 건드리지 않고
    // 파란 점 좌표만 갱신한다 — 늦게 도착한 위치가 사용자 조작을 덮어쓰면 안 된다(CS-1).
    const applyInitialCamera = (coords: Location.LocationObjectCoords) => {
      updateCurrentLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (userMovedCameraRef.current) {
        return;
      }

      moveCamera({
        latitude: coords.latitude,
        longitude: coords.longitude,
        zoom: deltaToZoom(0.2),
        duration: 500,
      });
    };

    const requestLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted' || cancelled) {
          return;
        }

        setLocationGranted(true);

        // 초기 카메라도 새 위치 fix를 요청하지 않는다(CS-1). 안드로이드
        // FusedLocationProvider는 기기가 정지해 있으면 위치 전달을 억제해서
        // 옵션 없는 getCurrentPositionAsync가 30초까지 지연될 수 있다 —
        // 그러면 초기 카메라 이동도 그만큼 늦는다. 캐시로 즉시 옮기고,
        // 정확한 값은 아래 구독이 파란 점으로 갱신한다.
        const lastKnown = await Location.getLastKnownPositionAsync();

        if (cancelled) {
          return;
        }

        if (lastKnown) {
          applyInitialCamera(lastKnown.coords);

          return;
        }

        // 캐시가 없을 때만 새 fix를 요청한다. 무기한 대기가 불가능하도록 상한을 건다(CS-1).
        const position = await getCurrentPositionWithinTimeout();

        if (cancelled || !position) {
          return;
        }

        applyInitialCamera(position.coords);
      } catch (error) {
        console.error('위치 권한 요청 실패:', error);
      }
    };

    requestLocation();

    return () => {
      cancelled = true;
    };
  }, [moveCamera, updateCurrentLocation]);

  // 위치 구독은 **포커스** 기준으로 시작·해제한다(CS-1).
  // 하단 탭 화면은 한 번 방문하면 다른 탭으로 옮겨도 마운트가 유지되므로, 언마운트에만
  // 해제를 걸면(= 평범한 useEffect) 지도를 보고 있지 않은 동안에도 앱이 살아 있는 내내
  // 구독이 돌아 배터리를 쓴다. **useEffect로 되돌리지 말 것 — 그 순간 규칙이 깨진다.**
  // 권한이 허용된 경우에만 구독하며, locationGranted가 의존성이라 권한을 처음 허용받은
  // 직후(포커스 상태)에도 이 이펙트가 다시 돌아 구독이 시작된다.
  useFocusEffect(
    useCallback(() => {
      if (!locationGranted) {
        return;
      }

      // 이번 포커스 구간을 식별하는 토큰. 매 포커스마다 새로 만들어 이전 구간의
      // 늦게 도착한 구독과 구분한다.
      const watchToken = {};

      void startLocationWatch(watchToken);

      return () => {
        stopLocationWatch();
      };
    }, [locationGranted, startLocationWatch, stopLocationWatch])
  );

  // 최초 진입 1회 규제 고지(CS-4) — 토스트로 노출 후 기기에 표시 완료 저장.
  useEffect(() => {
    const showNoticeOnce = async () => {
      const shown = await LocalStorageManager.get<boolean>(NOTICE_STORAGE_KEY);

      if (shown) {
        return;
      }

      app.getToastManager()?.show({
        message:
          '노지 야영은 지역에 따라 금지될 수 있어요. 이용 전 현지 규정을 확인하세요.',
      });

      await LocalStorageManager.set(NOTICE_STORAGE_KEY, true);
    };

    showNoticeOnce();
  }, []);

  // 현재 위치 버튼(CS-1) — 새 위치 fix를 요청하지 않는다.
  // 안드로이드 FusedLocationProvider는 기기가 정지해 있으면 위치 전달을 억제하는데
  // (logcat: stationary throttling engaged / location delivery blocked - too close),
  // 옵션 없는 getCurrentPositionAsync는 새 fix가 올 때까지 기다린다. 그래서 책상에 둔 폰에서는
  // 버튼을 눌러도 약 30초 뒤에야 지도가 움직였다(2026-07-29 Pixel 7 Pro 실측).
  // 예외가 아니라 지연이라 catch도 걸리지 않아 버튼이 죽은 것처럼 보였다.
  // 파란 점은 정상인데 버튼만 안 들었던 이유도 이것 — 점은 구독, 버튼은 일회성 요청이었다.
  // 그래서 ① 이미 구독 중인 위치(파란 점과 같은 소스) → ② 캐시 → ③ 상한 건 새 fix 순으로 쓴다.
  const handleMoveToCurrentLocation = useCallback(async () => {
    const moveToLocation = (latitude: number, longitude: number) => {
      moveCamera({
        latitude,
        longitude,
        zoom: deltaToZoom(0.2),
        duration: 500,
      });
    };

    // ① 구독 값이 있으면 즉시 이동 — 대부분 이 경로로 끝난다.
    // 단 **이번 구독 구간의 전달을 받은 뒤**여야 한다(CS-1). 탭을 벗어난 동안 사용자가
    // 이동했을 수 있어, 재진입 직후 보관 좌표를 그대로 쓰면 낡은 위치로 즉시 이동해 버린다.
    // 첫 전달 전에는 ②캐시 → ③상한 건 새 fix 폴백으로 넘긴다.
    const watched = isWatchedPositionFreshRef.current
      ? currentLocationRef.current
      : null;

    if (watched) {
      moveToLocation(watched.latitude, watched.longitude);

      return;
    }

    try {
      // ② 캐시된 마지막 위치는 새 fix를 기다리지 않고 즉시 반환된다.
      const lastKnown = await Location.getLastKnownPositionAsync();

      if (!mountedRef.current) {
        return;
      }

      if (lastKnown) {
        updateCurrentLocation({
          latitude: lastKnown.coords.latitude,
          longitude: lastKnown.coords.longitude,
        });
        moveToLocation(lastKnown.coords.latitude, lastKnown.coords.longitude);

        return;
      }

      // ③ 마지막 수단으로만 새 fix를 요청한다. 무기한 대기가 불가능하도록 상한을 건다.
      const position = await getCurrentPositionWithinTimeout();

      if (!mountedRef.current) {
        return;
      }

      if (!position) {
        app
          .getToastManager()
          ?.show({ message: CURRENT_LOCATION_FAILED_MESSAGE });

        return;
      }

      updateCurrentLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      moveToLocation(position.coords.latitude, position.coords.longitude);
    } catch (error) {
      console.error('현재 위치 이동 실패:', error);
      app.getToastManager()?.show({ message: CURRENT_LOCATION_FAILED_MESSAGE });
    }
  }, [moveCamera, updateCurrentLocation]);

  // 상세 시트의 위치로 이동 버튼(CS-2) — 지도를 움직였다가 다시 박지 위치로.
  // 검색 결과 선택과 동일한 줌 레벨로 이동한다.
  const handleMoveToSpot = useCallback(
    (spot: CampSpot) => {
      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [moveCamera]
  );

  // 박지 선택(CS-2): 마커 강조 + 상세 시트 오픈. 시트가 닫히면 강조를 해제한다.
  // 시트는 딤이 없어(sheetLargestUndimmedDetentIndex) 뒤 지도를 계속 조작할 수 있다 —
  // 즉 시트가 떠 있는 채로 다른 마커를 탭할 수 있으므로, 그때는 기존 시트를 닫고 새로 연다.
  // forceReplace: 즐겨찾기 시트 등 다른 시트가 떠 있는 상태에서 상세로 갈 때, 그 시트를
  // 상세로 교체한다(위로 쌓지 않음). 상세끼리 교체는 기존대로 isCampSiteDetailSheetOpen로 판단.
  // 화면에 떠 있는 상세 시트의 박지 id. 같은 박지를 다시 열지 않기 위한 기준이다.
  const openDetailSpotIdRef = useRef<string | null>(null);

  const openDetail = useCallback(
    (spot: CampSpot, forceReplace = false) => {
      // 같은 박지의 상세가 이미 떠 있으면 **다시 열지 않는다**. 예전에는 같은 라우트로
      // `replace`가 일어나 나가는 화면의 onClose가 방금 세운 선택을 도로 지웠고, 그 뒤로는
      // 몇 번을 눌러도 선택이 붙지 않았다(2026-08-04 사용자 제보). 선택만 세워 복구한다.
      if (
        !forceReplace &&
        isCampSiteDetailSheetOpen() &&
        openDetailSpotIdRef.current === spot.id
      ) {
        campSiteMap.selectSpot(spot);

        return;
      }

      campSiteMap.selectSpot(spot);
      openDetailSpotIdRef.current = spot.id;

      setCampSiteDetailSheet({
        onMoveToSpot: handleMoveToSpot,
        // 닫히는 시트가 이미 다른 박지로 넘어간 선택을 지우지 않게, 화면의 상세가 여전히
        // 자기 박지일 때만 정리한다.
        onClose: () => {
          if (openDetailSpotIdRef.current !== spot.id) {
            return;
          }

          openDetailSpotIdRef.current = null;

          if (campSiteMap.getSelectedSpot()?.id === spot.id) {
            campSiteMap.selectSpot(null);
          }
        },
      });

      if (forceReplace || isCampSiteDetailSheetOpen()) {
        router.replace(`/camp-site/${spot.id}`);

        return;
      }

      router.push(`/camp-site/${spot.id}`);
    },
    [campSiteMap, handleMoveToSpot, router]
  );

  // 홈 추천 박지 진입은 지도 탭을 먼저 열고, 지도 자체의 기존 상세 시트 경로를 재사용한다.
  // 지도 초기화가 끝난 뒤 포커스를 얻는 시점에 소비하므로 비로그인 홈에서도 동작한다(HM-11).
  useFocusEffect(
    useCallback(() => {
      if (spotsLoading) {
        return;
      }

      const spotId = getPendingCampSite();

      if (!spotId) {
        return;
      }

      clearPendingCampSite();
      const spot = campSiteMap.getSpotById(spotId);

      if (!spot) {
        return;
      }

      campSiteMap.resetFilters();
      openDetail(spot);
      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    }, [campSiteMap, moveCamera, openDetail, spotsLoading])
  );

  // 검색 결과 탭 → 키보드/드롭다운 닫기 + 필터 해제 + 카메라 이동(줌인) + 상세 시트 오픈(CS-6).
  // 검색어는 유지한다.
  const handleSelectResult = useCallback(
    (spot: CampSpot) => {
      Keyboard.dismiss();

      campSiteMap.setSearchFocused(false);
      // 고른 박지가 필터에 걸려 마커까지 사라지면 카메라만 옮겨간 빈 지도가 남는다.
      campSiteMap.resetFilters();
      openDetail(spot);

      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [campSiteMap, moveCamera, openDetail]
  );

  // 지명 검색 결과 탭 — 검색어·필터는 유지하고, 박지 선택·상세·마커 없이 카메라만 옮긴다(CS-6).
  const handleSelectPlace = useCallback(
    (place: GeocodeResult) => {
      Keyboard.dismiss();
      campSiteMap.setSearchFocused(false);

      moveCamera({
        latitude: place.latitude,
        longitude: place.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [campSiteMap, moveCamera]
  );

  // 검색 제출(CS-6): 확정된 이름 필터의 결과를 한 번만 카메라에 맞춘다.
  // 유형·태그·즐겨찾기와 AND 적용된 getVisibleSpots를 그대로 사용한다.
  const handleSubmitSearch = useCallback(() => {
    Keyboard.dismiss();
    campSiteMap.setSearchFocused(false);
    campSiteMap.submitSearchQuery();

    const submittedQuery = campSiteMap.getSubmittedSearchQuery();

    if (submittedQuery.length === 0) {
      return;
    }

    const spots = campSiteMap.getVisibleSpots();

    if (spots.length === 0) {
      return;
    }

    if (spots.length === 1) {
      moveCamera({
        latitude: spots[0].location.latitude,
        longitude: spots[0].location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });

      return;
    }

    const latitudes = spots.map(spot => spot.location.latitude);
    const longitudes = spots.map(spot => spot.location.longitude);
    const { width, height } = Dimensions.get('window');
    const paddingRatio = 1.25;
    let latitudeDelta = Math.max(
      (Math.max(...latitudes) - Math.min(...latitudes)) * paddingRatio,
      0.01
    );
    let longitudeDelta = Math.max(
      (Math.max(...longitudes) - Math.min(...longitudes)) * paddingRatio,
      0.01
    );

    // Region의 가로·세로 비율을 화면 비율에 맞춰 두 축의 마커가 모두 들어오게 한다.
    latitudeDelta = Math.max(latitudeDelta, longitudeDelta * (height / width));
    longitudeDelta = Math.max(longitudeDelta, latitudeDelta * (width / height));

    // bounds가 남한 전역보다 넓으면 CS-1 폴백 카메라에서 더 축소하지 않는다.
    if (
      latitudeDelta > KOREA_LATITUDE_DELTA ||
      longitudeDelta > KOREA_LATITUDE_DELTA * (width / height)
    ) {
      moveCamera({
        latitude: KOREA_CAMERA.latitude,
        longitude: KOREA_CAMERA.longitude,
        zoom: KOREA_CAMERA.zoom ?? 0,
        duration: 700,
      });

      return;
    }

    const centerLatitude = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;
    const centerLongitude =
      (Math.max(...longitudes) + Math.min(...longitudes)) / 2;

    moveCameraToRegion({
      latitude: centerLatitude - latitudeDelta / 2,
      longitude: centerLongitude - longitudeDelta / 2,
      latitudeDelta,
      longitudeDelta,
      duration: 700,
    });
  }, [campSiteMap, moveCamera, moveCameraToRegion]);

  // 마커 탭 콜백 — memo된 마커(CampSiteMarkerView)가 리렌더를 건너뛸 수 있게 참조를 고정한다.
  const handleMarkerTap = useCallback(
    (spot: CampSpot) => {
      openDetail(spot);
      // B: 선택 박지를 화면 중앙으로 부드럽게 이징(줌 유지) → 펄스(A)가 중앙에서 정렬돼 재생된다.
      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: zoomRef.current,
        duration: 400,
      });
    },
    [moveCamera, openDetail]
  );

  /**
   * 즐겨찾기 리스트 항목 탭(CS-9) — 상세를 즐겨찾기 시트 **위에 쌓는다**.
   *
   * 예전에는 `forceReplace`로 즐겨찾기를 상세로 교체해, 상세를 닫으면 지도로 빠져나갔다.
   * 쌓아 두면 닫을 때 즐겨찾기가 그대로 드러나 목록을 이어서 훑을 수 있다(2026-08-04 사용자
   * 요청). 시스템 dismiss가 알아서 이전 시트를 보여주므로 재오픈 로직·타이밍 처리가 없다.
   */
  const handleOpenFavoriteDetail = useCallback(
    (spot: CampSpot) => {
      campSiteMap.resetFilters();
      openDetail(spot);

      moveCamera({
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        zoom: deltaToZoom(0.05),
        duration: 500,
      });
    },
    [campSiteMap, moveCamera, openDetail]
  );

  // 즐겨찾기 ★ 칩 → 리스트 시트 열기(CS-9). 로그인 가드는 상단 오버레이가 이미 통과시킨 뒤 호출한다.
  // 시트가 열려 있는 동안 지도에는 즐겨찾기 마커만 표시하고(favoriteOnly), 시트가 완전히 닫히면
  // 핸드오프의 onClose가 필터를 해제한다. 목록은 로드에 따라 늘 수 있어 지연 조회 함수로 넘긴다.
  const handleOpenFavorites = useCallback(() => {
    // 비로그인은 로그인 안내 후 중단(CS-9). 로그인이면 즐겨찾기 0건이어도 빈 상태 시트를 연다.
    if (!app.getFirebase().isLoggedIn()) {
      app.getLogInAlertManager()?.show();

      return;
    }

    app.getAnalyticsManager()?.logClick('camp_site_favorites_open');

    campSiteMap.setFavoriteOnly(true);

    setCampSiteFavoritesSheet({
      getSpots: () => campSiteMap.getFavoriteSpots(),
      onOpenDetail: handleOpenFavoriteDetail,
      onClose: () => campSiteMap.setFavoriteOnly(false),
    });

    router.push('/camp-site-favorites');
  }, [campSiteMap, handleOpenFavoriteDetail, router]);

  // 지도 빈 곳 터치 → 마커 선택 해제 + 키보드 dismiss(드롭다운 blur로 닫힘, CS-6).
  // 네이버는 마커 onTap과 지도 onTapMap이 분리돼 있어 별도 경합 방어가 필요 없다.
  const handleTapMap = useCallback(() => {
    campSiteMap.selectSpot(null);

    // Android는 Keyboard.dismiss 후에도 blur가 안 뜰 수 있어 드롭다운 닫힘을 명시한다.
    campSiteMap.setSearchFocused(false);
    Keyboard.dismiss();
  }, [campSiteMap]);

  const handleCameraChanged = useCallback(
    (camera: Camera & { reason: CameraChangeReason }) => {
      if (!mountedRef.current) {
        return;
      }

      // 제스처로 움직인 순간부터는 초기 위치 조회 결과가 카메라를 덮어쓰지 않게 한다(CS-1).
      // 우리가 부른 animateCameraTo는 reason이 'Developer'라 이 가드에 걸리지 않는다.
      if (camera.reason === 'Gesture') {
        userMovedCameraRef.current = true;
      }

      const zoom = camera.zoom ?? 0;
      zoomRef.current = zoom;

      // 중심 0.05°·줌 0.25 단위 양자화 — 동일 값이면 React가 리렌더를 생략한다.
      const quantized = {
        latitude: Math.round(camera.latitude / 0.05) * 0.05,
        longitude: Math.round(camera.longitude / 0.05) * 0.05,
        zoom: Math.round(zoom / 0.25) * 0.25,
      };

      setViewport(prev =>
        prev &&
        prev.latitude === quantized.latitude &&
        prev.longitude === quantized.longitude &&
        prev.zoom === quantized.zoom
          ? prev
          : quantized
      );
    },
    []
  );

  // 첫 onCameraChanged 이전에도 마커가 보이도록 초기 뷰포트를 시드한다.
  // 실제 지도 화면 모서리 좌표(screenToCoordinate)로 복원하는 이유:
  // 화면 재마운트 시 네이티브 지도는 이전 카메라를 유지할 수 있어,
  // initialCamera(전국)로 시드하면 실제 화면과 다른 영역의 마커를 계산하게 된다.
  const handleMapInitialized = useCallback(() => {
    if (!mountedRef.current || !mapRef.current) {
      return;
    }

    const initializedMap = mapRef.current;

    mapReadyRef.current = true;
    flushPendingCamera();

    const seedViewportFromMap = async () => {
      const isMapActive = () =>
        mountedRef.current &&
        mapReadyRef.current &&
        mapRef.current === initializedMap;

      try {
        const { width, height } = Dimensions.get('window');
        const topLeft = await initializedMap.screenToCoordinate({
          screenX: 0,
          screenY: 0,
        });

        if (!isMapActive()) {
          return;
        }

        const bottomRight = await initializedMap.screenToCoordinate({
          screenX: width,
          screenY: height,
        });

        if (!isMapActive()) {
          return;
        }

        if (topLeft?.isValid && bottomRight?.isValid) {
          const latSpan = Math.abs(topLeft.latitude - bottomRight.latitude);
          const zoom = deltaToZoom(latSpan);

          setViewport(prev =>
            prev
              ? prev
              : {
                  latitude: (topLeft.latitude + bottomRight.latitude) / 2,
                  longitude: (topLeft.longitude + bottomRight.longitude) / 2,
                  zoom,
                }
          );

          return;
        }

        // 프로젝션이 아직 준비 전이면 초기 카메라(전국)로 폴백 — 이후 onCameraChanged가 보정한다.
        setViewport(prev =>
          prev
            ? prev
            : {
                latitude: KOREA_CAMERA.latitude,
                longitude: KOREA_CAMERA.longitude,
                zoom: KOREA_CAMERA.zoom ?? 0,
              }
        );
      } catch {
        return;
      }
    };

    void seedViewportFromMap();
  }, [flushPendingCamera]);

  return (
    <View style={styles.container}>
      <NaverMapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialCamera={KOREA_CAMERA}
        // 네이버 기본 현위치 버튼은 자체 버튼과 중복이라 숨긴다.
        isShowLocationButton={false}
        // 기본 줌 버튼/스케일바는 기존 지도 UI 톤(핀치 줌만)과 달라 숨긴다.
        isShowZoomControls={false}
        isShowScaleBar={false}
        onInitialized={handleMapInitialized}
        onTapMap={handleTapMap}
        onCameraChanged={handleCameraChanged}
      >
        <CampSiteMapMarkersView
          campSiteMap={campSiteMap}
          viewport={viewport}
          onTapSpot={handleMarkerTap}
        />
        {/* 내 위치 파란 점 — 네이티브 위치 오버레이의 줌 드리프트를 피해 지오 앵커 마커로 렌더한다(CS-1). */}
        {locationGranted && currentLocation ? (
          <CampSiteMyLocationMarkerView
            latitude={currentLocation.latitude}
            longitude={currentLocation.longitude}
          />
        ) : null}
      </NaverMapView>

      {/* A: 선택 박지 강조 펄스(화면 중앙 = 카메라 이징이 옮긴 위치). pointerEvents none. */}
      <CampSiteSelectedPulseView campSiteMap={campSiteMap} />

      <CampSiteMapTopOverlayView
        campSiteMap={campSiteMap}
        onSelectResult={handleSelectResult}
        onSelectPlace={handleSelectPlace}
        onSubmitSearch={handleSubmitSearch}
      />

      <CampSiteMapBottomOverlayView
        bottomClearance={bottomClearance}
        locationGranted={locationGranted}
        onMoveToCurrentLocation={handleMoveToCurrentLocation}
        onOpenFavorites={handleOpenFavorites}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
});

export default observer(CampSiteMapView);
