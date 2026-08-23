/* eslint-disable react-hooks/refs, react-hooks/set-state-in-effect */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard } from 'react-native';
import {
  Camera,
  CameraChangeReason,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import * as Location from 'expo-location';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import { GeocodeResult } from '@/model/bag-destination/GeocodeResult';
import geocodeService, {
  GEOCODE_DEBOUNCE_MS,
  GEOCODE_MIN_QUERY_LENGTH,
  FALLBACK_LOCATION_NAME,
} from '@/model/bag-destination/GeocodeService';
import {
  Coordinate,
  getDistanceInMeters,
} from '@/model/bag-destination/GeoDistance';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import { CampSiteMapViewport } from '@/components/camp-site/CampSiteMapMarkersView';
import { deltaToZoom } from '@/model/map/MapZoom';
import {
  getCurrentPositionWithinTimeout,
} from '@/model/location/CurrentLocation';
import app from '@/model/app/App';

// 저장된 여행지도 없고 위치 권한도 없을 때의 기본 중심(DST-3).
const SEOUL_CITY_HALL: Coordinate = { latitude: 37.5665, longitude: 126.978 };

const PICKED_ZOOM = deltaToZoom(0.02);
const DEFAULT_ZOOM = deltaToZoom(0.05);

// 박지를 포커스한 뒤 제스처로 이만큼 넘게 벗어나면 자유 위치 UI로 되돌린다(DST-3).
const SPOT_RELEASE_METERS = 100;
// 같은 지점으로 볼 거리 — 박지·장소 중복 제거(DST-4)와 알려진 이름 재사용에 쓴다.
const SAME_PLACE_METERS = 100;
// 이 거리 미만의 중심 변화는 무시한다 — 네이티브 지도가 리렌더 때마다 부동소수점 수준으로
// 미세하게 다른 카메라를 onCameraChanged로 되쏘는데, 정확 비교(===)면 그때마다 center가
// 갱신돼 불필요한 리렌더가 늘어난다.
const CENTER_SETTLE_METERS = 1;
// 카메라가 이만큼 멈춰 있어야 정착으로 보고 역지오코딩한다 — 진동이 지속되는 동안에는
// 정착값이 갱신되지 않아 이펙트가 돌지 않는다(무한 루프 방지).
const CAMERA_SETTLE_MS = 300;

// 위치 구독 전달 간격 — 지도 탭(CS-1)과 같은 값을 쓴다. 두 지도 화면이 위치를 서로 다르게
// 다루던 것이 애초에 이 버그의 씨앗이었다(DST-3).
const LOCATION_WATCH_DISTANCE_INTERVAL_METERS = 10;

const REVERSE_GEOCODE_DEBOUNCE_MS = 500;
const MAP_READY_FALLBACK_MAX_FRAMES = 3;

// 이미 허용된 권한만 확인한다 — 선택기를 여는 것만으로 권한을 새로 요청하지 않는다(DST-3).
// 초기 카메라 시드는 **캐시만** 쓴다(DST-3). 여기서 새 fix를 기다리면 안드로이드 정지
// 스로틀링에 걸려 약 30초 동안 지도에 줄 좌표가 없어 화면 자체가 안 뜬다
// (원인은 model/location/CurrentLocation.ts 주석 참고). 이 좌표는 화면을 여는 순간의
// 중심일 뿐이고 사용자가 곧 조정하므로 신선도보다 즉시성이 중요하다.
// getLastKnownPositionAsync는 캐시를 즉시 반환하고, 캐시가 없으면 기다리지 않고 null을
// 돌려 호출부가 서울 시청 폴백으로 넘어간다 — 그래서 이 함수는 절대 블로킹하지 않는다.
const getGrantedPosition = async (): Promise<Coordinate | null> => {
  try {
    const { granted } = await Location.getForegroundPermissionsAsync();

    if (!granted) {
      return null;
    }

    const lastKnown = await Location.getLastKnownPositionAsync();

    if (!lastKnown) {
      return null;
    }

    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  } catch (error) {
    console.error('현재 위치 조회 실패:', error); // l10n-ignore: 개발자 로그

    return null;
  }
};

interface Params {
  currentLocation: BagLocation | null;
  visible: boolean;
  onConfirm: (location: BagLocation) => Promise<void>;
  onClose: () => void;
  onDone: (() => void) | undefined;
  campSiteMap: CampSiteMap;
  isMapSupported: boolean;
  mapRef: React.RefObject<NaverMapViewRef | null>;
}

interface PendingCameraTarget extends Coordinate {
  visibleGeneration: number;
}

// 공용 여행지 선택기(DST-3/DST-4)의 상태·핸들러. 뷰는 조립만 담당한다.
// 호출하는 컴포넌트가 observer라 여기서 읽는 CampSiteMap의 observable도 함께 추적된다.
const useBagDestinationPickerState = ({
  currentLocation,
  visible,
  onConfirm,
  onClose,
  onDone,
  campSiteMap,
  isMapSupported,
  mapRef,
}: Params) => {
  // 지도는 origin이 정해진 뒤에만 마운트한다 — initialCamera를 한 번만 확정해
  // 카메라 재적용으로 인한 이동 루프를 막는다.
  const [origin, setOrigin] = useState<Camera | null>(null);
  const [center, setCenter] = useState<Coordinate>(SEOUL_CITY_HALL);
  // 카메라가 멈춘 뒤에만 갱신되는 정착 중심(정착 전엔 null). 역지오코딩 이펙트는 center가
  // 아니라 이 값에 반응한다 — center는 네이티브 지도가 리렌더마다 미세하게 다른 값을 되쏴
  // 진동하는데, 그 진동에 이펙트가 반응하면 setState→리렌더→재발화 무한 루프가 되기 때문이다.
  // 이펙트가 안 돌면 리렌더도 없어 재발화가 멎고, 그때 정착값이 갱신돼 주소를 조회한다.
  const [settledCenter, setSettledCenter] = useState<Coordinate | null>(null);
  const [viewport, setViewport] = useState<CampSiteMapViewport | null>(null);
  // 박지 확정(handleConfirmSpot) 경로에서만 잠깐 채워지는 확정 대상. 선택 모드가 없어져
  // 평소에는 항상 null이고, 하단 확정 버튼은 언제나 지도 중심(자유 위치)을 저장한다(DST-3).
  const [selectedCampLocation, setSelectedCampLocation] =
    useState<BagLocation | null>(null);
  // 표시 전용 박지 포커스 — null이면 자유 위치 UI를 노출한다(DST-3).
  const [focusedSpot, setFocusedSpot] = useState<CampSpot | null>(null);
  const [addressName, setAddressName] = useState('');
  const [resolving, setResolving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [query, setQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<GeocodeResult[]>([]);
  const [searchingPlaces, setSearchingPlaces] = useState(false);
  // 지도를 탭해 결과만 닫은 상태(검색어는 유지, DST-4).
  const [resultsDismissed, setResultsDismissed] = useState(false);

  // 저장/검색으로 이름을 이미 아는 좌표. 이 근처에선 역지오코딩 대신 이 이름을 쓴다.
  const knownRef = useRef<(Coordinate & { name: string }) | null>(null);
  const selectedCampLocationRef = useRef<BagLocation | null>(null);
  // 표시 전용 박지 포커스(위 focusSpot 주석 참고). 콜백 안에서 최신값을 읽으려 ref를 함께 둔다.
  const focusedSpotRef = useRef<CampSpot | null>(null);
  const mountedRef = useRef(true);
  const visibleGenerationRef = useRef(0);
  const previousVisibleRef = useRef(visible);
  const visibleRef = useRef(visible);
  const userInteractionRef = useRef(0);
  const savingRef = useRef(false);
  const mapReadyRef = useRef(false);
  const mapReadyGenerationRef = useRef<number | null>(null);
  const pendingCameraTargetRef = useRef<PendingCameraTarget | null>(null);
  const pendingCameraFrameRef = useRef<number | null>(null);
  const mapReadyFallbackFrameRef = useRef<number | null>(null);
  // 선택기가 열려 있는 동안 유지하는 위치 구독과 그 최신 좌표(DST-3).
  // 좌표를 state가 아니라 ref에 두는 이유 — 이 값은 현재 위치 버튼 핸들러만 읽는데,
  // state로 두면 위치가 갱신될 때마다 지도·하단 패널까지 리렌더된다(카메라도 따라가지 않는다).
  const watchedPositionRef = useRef<Coordinate | null>(null);
  const locationWatchRef = useRef<Location.LocationSubscription | null>(null);
  // 구독을 소유한 visible 세대. 시작 중(await 사이)에도 채워져 있어 중복 시작을 막고,
  // 세대가 바뀌면 늦게 도착한 구독을 그 자리에서 해제하는 판단 근거가 된다.
  const locationWatchGenerationRef = useRef<number | null>(null);
  // 프롭 변화로 초기화 이펙트가 다시 돌지 않도록(열릴 때 1회만 읽는다).
  const currentLocationRef = useRef(currentLocation);

  if (previousVisibleRef.current !== visible) {
    previousVisibleRef.current = visible;
    visibleGenerationRef.current += 1;
  }

  visibleRef.current = visible;
  currentLocationRef.current = currentLocation;

  const mapGeneration = visibleGenerationRef.current;

  const cancelMapReadyFallback = useCallback(() => {
    if (mapReadyFallbackFrameRef.current !== null) {
      cancelAnimationFrame(mapReadyFallbackFrameRef.current);
      mapReadyFallbackFrameRef.current = null;
    }
  }, []);

  const resetMapCommandState = useCallback(() => {
    if (pendingCameraFrameRef.current !== null) {
      cancelAnimationFrame(pendingCameraFrameRef.current);
      pendingCameraFrameRef.current = null;
    }

    cancelMapReadyFallback();
    mapReadyRef.current = false;
    mapReadyGenerationRef.current = null;
    pendingCameraTargetRef.current = null;
  }, [cancelMapReadyFallback]);

  const animateCamera = useCallback(
    (target: Coordinate) => {
      mapRef.current?.animateCameraTo({
        latitude: target.latitude,
        longitude: target.longitude,
        zoom: PICKED_ZOOM,
        duration: 400,
      });
    },
    [mapRef]
  );

  const schedulePendingCamera = useCallback(
    (visibleGeneration: number) => {
      const pending = pendingCameraTargetRef.current;

      if (
        !pending ||
        pending.visibleGeneration !== visibleGeneration ||
        pendingCameraFrameRef.current !== null
      ) {
        return;
      }

      pendingCameraFrameRef.current = requestAnimationFrame(() => {
        pendingCameraFrameRef.current = null;

        const pending = pendingCameraTargetRef.current;

        if (!pending || pending.visibleGeneration !== visibleGeneration) {
          return;
        }

        if (
          !mountedRef.current ||
          savingRef.current ||
          !visibleRef.current ||
          visibleGenerationRef.current !== visibleGeneration ||
          !mapReadyRef.current ||
          mapReadyGenerationRef.current !== visibleGeneration ||
          !mapRef.current
        ) {
          return;
        }

        pendingCameraTargetRef.current = null;
        animateCamera(pending);
      });
    },
    [animateCamera, mapRef]
  );

  const handleMapInitialized = useCallback(() => {
    if (
      !mountedRef.current ||
      !visibleRef.current ||
      visibleGenerationRef.current !== mapGeneration
    ) {
      return;
    }

    cancelMapReadyFallback();
    mapReadyRef.current = true;
    mapReadyGenerationRef.current = mapGeneration;
    schedulePendingCamera(mapGeneration);
  }, [cancelMapReadyFallback, mapGeneration, schedulePendingCamera]);

  const markUserInteraction = useCallback((): number => {
    userInteractionRef.current += 1;

    return userInteractionRef.current;
  }, []);

  const isCurrentVisibleGeneration = useCallback(
    (visibleGeneration: number): boolean => {
      return (
        mountedRef.current &&
        visibleRef.current &&
        visibleGenerationRef.current === visibleGeneration
      );
    },
    []
  );

  const isCurrentInteraction = useCallback(
    (visibleGeneration: number, userInteraction: number): boolean => {
      return (
        isCurrentVisibleGeneration(visibleGeneration) &&
        userInteractionRef.current === userInteraction
      );
    },
    [isCurrentVisibleGeneration]
  );

  // 위치 구독을 닫고 보관 좌표를 버린다(DST-3). 선택기가 닫히거나 언마운트될 때 호출한다.
  // 좌표까지 비우는 이유 — 다음에 열었을 때 이전 세션의 낡은 좌표를 "현재 위치"로 쓰면 안 된다.
  // 지도 탭(CampSiteMapView, CS-1)은 같은 목적을 신선도 플래그로 달성하는데, 이 차이는
  // 의도된 것이다 — 거기선 보관 좌표를 파란 점으로 그리고 있어 비우면 점이 깜빡인다.
  // 여기선 좌표를 화면에 그리지 않아 비우는 쪽이 더 단순하고 낡은 값을 남기지 않는다.
  const stopLocationWatch = useCallback(() => {
    locationWatchGenerationRef.current = null;
    locationWatchRef.current?.remove();
    locationWatchRef.current = null;
    watchedPositionRef.current = null;
  }, []);

  // 선택기가 열려 있는 동안 위치를 구독한다(DST-3).
  // 왜 구독인가 — 아무도 구독하지 않는 동안 fused provider는 `ProviderRequest[OFF]`라
  // OS가 위치를 계산조차 하지 않는다(2026-07-29 dumpsys 실기기 확인). 그 상태에서 버튼이
  // 일회성으로 새 fix를 요구하면 provider 기동 + 안드로이드 정지 스로틀이 겹쳐 약 30초가
  // 걸렸다. 구독이 열려 있으면 provider가 켜져 있어 최신 좌표가 항상 준비돼 있고, 버튼은
  // 그 값을 대기 0으로 쓴다. **일회성 요청으로 되돌리지 말 것 — 지연이 재발한다.**
  // 좌표는 보관만 하고 카메라는 건드리지 않는다 — 사용자가 지도를 보며 좌표를 고르는
  // 화면이라 위치가 갱신될 때마다 화면이 따라가면 좌표를 고를 수 없다(CS-1의 NoFollow와 동일).
  const startLocationWatch = useCallback(
    async (visibleGeneration: number) => {
      // 이미 이 세대의 구독을 열었거나 여는 중이면 중복으로 열지 않는다.
      if (locationWatchGenerationRef.current === visibleGeneration) {
        return;
      }

      locationWatchGenerationRef.current = visibleGeneration;

      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: LOCATION_WATCH_DISTANCE_INTERVAL_METERS,
          },
          next => {
            watchedPositionRef.current = {
              latitude: next.coords.latitude,
              longitude: next.coords.longitude,
            };
          }
        );

        // await 사이에 선택기가 닫혔거나 언마운트됐으면 여기가 유일한 해제 지점이다.
        if (
          locationWatchGenerationRef.current !== visibleGeneration ||
          !isCurrentVisibleGeneration(visibleGeneration)
        ) {
          subscription.remove();

          return;
        }

        locationWatchRef.current = subscription;
      } catch (error) {
        // 구독을 못 열어도(위치 서비스 꺼짐 등) 버튼은 캐시·새 fix로 폴백하므로 화면은 살아 있다.
    console.error('현재 위치 구독 실패:', error); // l10n-ignore: 개발자 로그

        if (locationWatchGenerationRef.current === visibleGeneration) {
          locationWatchGenerationRef.current = null;
        }
      }
    },
    [isCurrentVisibleGeneration]
  );

  const ensureOrigin = useCallback((target: Coordinate) => {
    const camera = { ...target, zoom: PICKED_ZOOM };

    setOrigin(prev => prev ?? camera);
    setViewport(prev => prev ?? camera);
  }, []);

  // ref를 동기적으로 갱신한다 — 확정 흐름(buildLocation)이 리렌더를 기다리지 않고
  // 곧바로 최신 값을 읽어야 하기 때문이다.
  const selectCampLocation = useCallback((location: BagLocation | null) => {
    selectedCampLocationRef.current = location;
    setSelectedCampLocation(location);
  }, []);

  // 박지 포커스는 **표시 전용** 상태다(DST-3) — 마커·검색·즐겨찾기로 박지를 들여다보는 동안
  // 하단 자유 위치 UI(주소 + `이 위치로 설정`)를 감추는 데만 쓴다. 확정 대상인
  // selectedCampLocationRef에는 절대 손대지 않아, `이 위치로 설정`이 항상 지도 중심을
  // 저장한다는 보장이 유지된다. 지도를 제스처로 충분히 움직이면 해제된다.
  const focusSpot = useCallback((spot: CampSpot | null) => {
    focusedSpotRef.current = spot;
    setFocusedSpot(spot);
  }, []);

  const selectSpot = useCallback(
    (spot: CampSpot) => {
      selectCampLocation({
        name: spot.name,
        latitude: spot.location.latitude,
        longitude: spot.location.longitude,
        campSpotId: spot.id,
      });
    },
    [selectCampLocation]
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      resetMapCommandState();
    };
  }, [resetMapCommandState]);

  useEffect(() => {
    if (visible && !saving) {
      void campSiteMap.initialize();
    }
  }, [campSiteMap, saving, visible]);

  // 열릴 때 초기 중심을 확정하고, 닫히면 지도를 내려 다음 열기에 다시 잡게 한다.
  useEffect(() => {
    const visibleGeneration = mapGeneration;

    resetMapCommandState();
    userInteractionRef.current = 0;

    if (!visible) {
      setOrigin(null);
      setViewport(null);
      setLocating(false);

      return;
    }

    let cancelled = false;

    const prepare = async () => {
      const saved = currentLocationRef.current;
      const initialInteraction = userInteractionRef.current;

      setQuery('');
      setPlaceResults([]);
      setResultsDismissed(false);
      setResolving(false);
      // 저장된 여행지가 박지여도 미리 선택하지 않는다 — 남아 있으면 하단 `이 위치로 설정`이
      // 지도 중심 대신 그 박지를 저장해 버린다(DST-3, 박지 선택 모드 폐지).
      selectCampLocation(null);

      // 저장된 여행지가 있으면 그 좌표로 연다(지도 범위 밖이어도 그대로 쓴다).
      if (saved) {
        const start = { latitude: saved.latitude, longitude: saved.longitude };

        knownRef.current = { ...start, name: saved.name };
        setCenter(start);
        setAddressName(saved.name);
        setOrigin({ ...start, zoom: PICKED_ZOOM });
        setViewport({ ...start, zoom: PICKED_ZOOM });

        return;
      }

      knownRef.current = null;
      setAddressName('');

      if (!isMapSupported) {
        return;
      }

      const granted = await getGrantedPosition();

      if (
        cancelled ||
        !isCurrentInteraction(visibleGeneration, initialInteraction)
      ) {
        return;
      }

      const start = granted ?? SEOUL_CITY_HALL;
      const zoom = granted ? PICKED_ZOOM : DEFAULT_ZOOM;

      setCenter(start);
      setOrigin({ ...start, zoom });
      setViewport({ ...start, zoom });
    };

    void prepare();

    return () => {
      cancelled = true;
      resetMapCommandState();
    };
  }, [
    visible,
    isMapSupported,
    isCurrentInteraction,
    mapGeneration,
    resetMapCommandState,
    selectCampLocation,
  ]);

  // 위치 구독의 생명주기는 선택기 화면과 같다(DST-3) — 열릴 때 시작하고 닫힐 때·언마운트 때
  // 해제한다. **권한을 새로 요청하지 않는다**: 선택기를 여는 것만으로 권한 요청이 뜨면 안 되므로
  // 이미 허용된 경우에만 시작한다. 열 때 권한이 없었다면 현재 위치 버튼이 허용을 받은 시점에
  // 같은 함수로 구독을 시작한다.
  useEffect(() => {
    if (!visible || !isMapSupported) {
      return;
    }

    // 세대는 렌더 중에 이미 갱신돼 있어 이펙트 본문에서 읽으면 이번 열기의 값이다.
    const visibleGeneration = visibleGenerationRef.current;

    let cancelled = false;

    const startWatchIfGranted = async () => {
      try {
        const { granted } = await Location.getForegroundPermissionsAsync();

        if (cancelled || !granted) {
          return;
        }

        await startLocationWatch(visibleGeneration);
      } catch (error) {
    console.error('위치 권한 확인 실패:', error); // l10n-ignore: 개발자 로그
      }
    };

    void startWatchIfGranted();

    return () => {
      cancelled = true;
      stopLocationWatch();
    };
  }, [visible, isMapSupported, startLocationWatch, stopLocationWatch]);

  // iOS legacy architecture에서 onInitialized가 유실돼도, 지도 ref 커밋 뒤
  // 프로그램 카메라 명령을 실행할 수 있도록 짧게 readiness를 확인한다.
  useEffect(() => {
    const visibleGeneration = mapGeneration;

    if (
      !visible ||
      !origin ||
      saving ||
      (mapReadyRef.current &&
        mapReadyGenerationRef.current === visibleGeneration)
    ) {
      cancelMapReadyFallback();

      return;
    }

    let cancelled = false;
    let attempts = 0;

    const checkMapReady = () => {
      mapReadyFallbackFrameRef.current = requestAnimationFrame(() => {
        mapReadyFallbackFrameRef.current = null;

        if (
          cancelled ||
          !mountedRef.current ||
          savingRef.current ||
          !visibleRef.current ||
          visibleGenerationRef.current !== visibleGeneration
        ) {
          return;
        }

        if (mapRef.current) {
          mapReadyRef.current = true;
          mapReadyGenerationRef.current = visibleGeneration;
          schedulePendingCamera(visibleGeneration);

          return;
        }

        attempts += 1;

        if (attempts < MAP_READY_FALLBACK_MAX_FRAMES) {
          checkMapReady();
        }
      });
    };

    checkMapReady();

    return () => {
      cancelled = true;
      cancelMapReadyFallback();
    };
  }, [
    cancelMapReadyFallback,
    mapGeneration,
    mapRef,
    origin,
    saving,
    schedulePendingCamera,
    visible,
  ]);

  // 지도 중심 주소를 미리 본다(하단 패널은 언제나 자유 위치, DST-3).
  // 박지 확정 중(selectedCampLocation)에만 잠깐 건너뛴다.
  // 카메라가 CAMERA_SETTLE_MS 동안 멈추면 그때의 center를 정착값으로 확정한다.
  // center가 진동하는 동안에는 타이머가 계속 리셋돼 setSettledCenter가 호출되지 않으므로,
  // 역지오코딩 이펙트(settledCenter dep)도 돌지 않아 무한 루프가 생기지 않는다.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSettledCenter(prev =>
        prev && getDistanceInMeters(prev, center) < CENTER_SETTLE_METERS
          ? prev
          : center
      );
    }, CAMERA_SETTLE_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [center]);

  useEffect(() => {
    if (!visible || !origin || selectedCampLocation || !settledCenter) {
      return;
    }

    const known = knownRef.current;

    if (known && getDistanceInMeters(known, settledCenter) <= SAME_PLACE_METERS) {
      setAddressName(known.name);
      setResolving(false);

      return;
    }

    let cancelled = false;

    setResolving(true);

    const timer = setTimeout(async () => {
      try {
        const name = await geocodeService.reverseGeocode(
          settledCenter.latitude,
          settledCenter.longitude
        );

        if (!cancelled) {
          setAddressName(name);
        }
      } catch (error) {
    console.error('역지오코딩 실패:', error); // l10n-ignore: 개발자 로그

        // 이름을 못 찾아도 확정은 가능하다 — 확정 시 폴백 이름으로 저장한다(DST-3).
        if (!cancelled) {
          setAddressName('');
        }
      } finally {
        if (!cancelled) {
          setResolving(false);
        }
      }
    }, REVERSE_GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, origin, selectedCampLocation, settledCenter]);

  // 카카오 장소 검색만 디바운스한다(DST-4) — 박지는 이미 로드된 목록이라 즉시 필터한다.
  useEffect(() => {
    const trimmed = query.trim();

    if (trimmed.length < GEOCODE_MIN_QUERY_LENGTH) {
      setPlaceResults([]);
      setSearchingPlaces(false);

      return;
    }

    let cancelled = false;

    setSearchingPlaces(true);

    const timer = setTimeout(async () => {
      try {
        const found = await geocodeService.geocode(trimmed);

        if (!cancelled) {
          setPlaceResults(found);
        }
      } catch (error) {
        // 장소 검색이 실패해도 박지 결과는 그대로 표시한다(DST-4).
    console.error('장소 검색 실패:', error); // l10n-ignore: 개발자 로그

        if (!cancelled) {
          setPlaceResults([]);
        }
      } finally {
        if (!cancelled) {
          setSearchingPlaces(false);
        }
      }
    }, GEOCODE_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const trimmedQuery = query.trim();
  const hasQuery = trimmedQuery.length >= GEOCODE_MIN_QUERY_LENGTH;
  // 렌더 중에 읽어 박지 로드 완료 시에도 결과가 갱신되게 한다(observer가 추적).
  // 박지 데이터 로드가 실패하면 빈 배열이 되고 장소 검색·자유 핀은 그대로 쓸 수 있다(DST-4).
  const spotResults = hasQuery ? campSiteMap.searchSpotsBy(trimmedQuery) : [];

  // 이름이 같고 100m 이내인 장소는 제거한다 — 박지 연결·상세가 가능한 쪽을 남긴다(DST-4).
  const visiblePlaceResults = hasQuery
    ? placeResults.filter(
        place =>
          !campSiteMap.getSpotsByName(place.name).some(
            spot =>
              getDistanceInMeters(spot.location, place) <= SAME_PLACE_METERS
          )
      )
    : [];

  const resultsVisible = hasQuery && !resultsDismissed;

  const moveCamera = useCallback(
    (target: Coordinate) => {
      if (!mountedRef.current || !visibleRef.current || savingRef.current) {
        return;
      }

      const visibleGeneration = visibleGenerationRef.current;

      pendingCameraTargetRef.current = {
        ...target,
        visibleGeneration,
      };

      if (
        mapReadyRef.current &&
        mapReadyGenerationRef.current === visibleGeneration
      ) {
        schedulePendingCamera(visibleGeneration);
      }
    },
    [schedulePendingCamera]
  );

  const handleCameraChanged = useCallback(
    (camera: Camera & { reason: CameraChangeReason }) => {
      if (savingRef.current) {
        return;
      }

      const next = {
        latitude: camera.latitude,
        longitude: camera.longitude,
      };

      if (camera.reason === 'Gesture') {
        if (pendingCameraFrameRef.current !== null) {
          cancelAnimationFrame(pendingCameraFrameRef.current);
          pendingCameraFrameRef.current = null;
        }

        pendingCameraTargetRef.current = null;
        markUserInteraction();

        // 미세 변화는 무시해 center를 안정시킨다 — 무한 리렌더 방지(CENTER_SETTLE_METERS 주석 참고).
        setCenter(prev =>
          getDistanceInMeters(prev, next) < CENTER_SETTLE_METERS ? prev : next
        );

        // 포커스한 박지에서 제스처로 충분히 벗어나면 자유 위치로 되돌린다(DST-3) — 하단
        // `이 위치로 설정` 패널이 다시 나타난다. 검색 결과 이동 등 Developer 애니메이션으로는
        // 풀리지 않는다(그건 여전히 그 박지를 보고 있는 것).
        const focused = focusedSpotRef.current;

        if (
          focused &&
          getDistanceInMeters(focused.location, next) > SPOT_RELEASE_METERS
        ) {
          knownRef.current = null;
          setAddressName('');
          focusSpot(null);
        }
      }

      // 중심 0.05°·줌 0.25 단위 양자화 — 값이 같으면 마커 레이어가 리렌더되지 않는다.
      const quantized = {
        latitude: Math.round(next.latitude / 0.05) * 0.05,
        longitude: Math.round(next.longitude / 0.05) * 0.05,
        zoom: Math.round((camera.zoom ?? 0) / 0.25) * 0.25,
      };

      setViewport(prev =>
        prev &&
        prev.latitude === quantized.latitude &&
        prev.longitude === quantized.longitude &&
        prev.zoom === quantized.zoom
          ? prev
          : quantized
      );

      // 알려진 이름에서 충분히 멀어지면 그 이름을 버리고 다시 역지오코딩하게 한다.
      // 확정 대상(selectedCampLocation) 해제 분기는 없다 — 선택 모드가 폐지돼 끌어서 풀
      // 선택 자체가 없다(DST-3). 위에서 푸는 건 표시 전용 포커스뿐이다.
      if (camera.reason === 'Gesture') {
        const known = knownRef.current;

        if (!known || getDistanceInMeters(known, next) > SAME_PLACE_METERS) {
          knownRef.current = null;
          setAddressName('');
        }
      }
    },
    [focusSpot, markUserInteraction]
  );

  // 박지 마커·박지 검색 결과·즐겨찾기 항목 탭 → 그 박지로 카메라만 옮긴다(DST-3).
  // 선택은 하지 않는다 — 박지 확정은 상세 시트의 CTA(handleConfirmSpot)가 유일한 경로다.
  const handleFocusSpot = useCallback(
    (spot: CampSpot) => {
      if (savingRef.current) {
        return;
      }

      Keyboard.dismiss();

      markUserInteraction();
      knownRef.current = null;
      setResultsDismissed(true);
      setCenter(spot.location);
      ensureOrigin(spot.location);
      moveCamera(spot.location);
      focusSpot(spot);
    },
    [ensureOrigin, focusSpot, markUserInteraction, moveCamera]
  );

  // 카카오 장소 선택 → 자유 위치 모드. 기존 박지 링크는 여기서 풀린다(DST-7).
  const handleSelectPlace = useCallback(
    (place: GeocodeResult) => {
      if (savingRef.current) {
        return;
      }

      Keyboard.dismiss();

      const target = { latitude: place.latitude, longitude: place.longitude };

      markUserInteraction();
      knownRef.current = { ...target, name: place.name };
      setResultsDismissed(true);
      selectCampLocation(null);
      // 장소 검색 결과는 명시적인 자유 위치 의사표시라 박지 포커스를 푼다(DST-3).
      focusSpot(null);
      setAddressName(place.name);
      setCenter(target);
      ensureOrigin(target);
      moveCamera(target);
    },
    [
      ensureOrigin,
      focusSpot,
      markUserInteraction,
      moveCamera,
      selectCampLocation,
    ]
  );

  const handleChangeQuery = useCallback((value: string) => {
    if (savingRef.current) {
      return;
    }

    setQuery(value);
    setPlaceResults([]);
    setSearchingPlaces(value.trim().length >= GEOCODE_MIN_QUERY_LENGTH);
    setResultsDismissed(false);
  }, []);

  const handleFocusSearch = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    setResultsDismissed(false);
    void campSiteMap.initialize();
  }, [campSiteMap]);

  // 지우기: 검색어와 양쪽 결과를 모두 초기화한다(DST-4).
  const handleClearQuery = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    setQuery('');
    setPlaceResults([]);
    setSearchingPlaces(false);
    setResultsDismissed(false);
  }, []);

  // 지도 탭: 결과와 키보드만 닫고 검색어는 유지한다(DST-4).
  const handleTapMap = useCallback(() => {
    if (savingRef.current) {
      return;
    }

    Keyboard.dismiss();
    markUserInteraction();
    setResultsDismissed(true);
  }, [markUserInteraction]);

  // 현재 위치 버튼에서만 권한을 요청한다(DST-3).
  // 폴백 사슬은 지도 탭(CS-1)과 완전히 같다: ① 구독 값(대기 0) → ② 캐시 → ③ 상한 건 새 fix.
  // 왜 버튼이 스스로 새 fix를 요청하지 않는가 — 아무도 구독하지 않는 동안 fused provider는
  // `ProviderRequest[OFF]`라 OS가 위치를 계산조차 하지 않는다(2026-07-29 dumpsys 확인).
  // 그 상태에서 일회성으로 새 fix를 요구하면 provider 기동 + 정지 스로틀이 겹쳐 약 30초가 걸렸다
  // (자세한 내용은 model/location/CurrentLocation.ts 주석 참고). 그래서 선택기가 열려 있는 동안
  // 구독을 유지하고 버튼은 그 값을 쓴다. **일회성 요청으로 되돌리지 말 것.**
  const handleMoveToCurrentLocation = useCallback(async () => {
    // locating이 풀리기 전 연타는 무시한다 — 폴백 조회가 겹쳐 돌면 안 된다(DST-3).
    if (!isMapSupported || savingRef.current || locating) {
      return;
    }

    const visibleGeneration = visibleGenerationRef.current;
    const userInteraction = userInteractionRef.current;

    setLocating(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      if (status !== 'granted') {
        Alert.alert(
          app.getL10n().t('bagDestination.permissionTitle'),
          app.getL10n().t('bagDestination.permissionMessage')
        );

        return;
      }

      // 선택기를 열 때는 권한이 없어 구독을 못 걸었을 수 있다 — 여기서 새로 허용받았다면
      // 그 시점부터 구독을 시작한다(DST-3). 이미 구독 중이면 내부에서 무시된다.
      // 이번 탭은 아직 구독 값이 없어 아래 폴백으로 끝나지만, 다음 탭부터는 대기 0이 된다.
      void startLocationWatch(visibleGeneration);

      // ① 구독 값이 있으면 즉시 쓴다 — 대기 0이고 걸어가는 중에도 최신이다(DST-3).
      let target = watchedPositionRef.current;

      if (!target) {
        // ② 캐시는 즉시 반환되지만 **우리 앱이 아니라 기기 전체가** 채우는 값이라 낡을 수 있다
        // (DST-3 정정 이력 ③ — 실측 나이 8분 32초). 구독 첫 전달 전에만 쓰는 폴백이다.
        const lastKnown = await Location.getLastKnownPositionAsync();

        // ③ 캐시도 없으면 마지막으로 상한을 건 새 fix를 요청한다. 스로틀 상황에서는 상한을
        // 통째로 대기할 수 있어 사슬의 맨 끝이다.
        const position = lastKnown ?? (await getCurrentPositionWithinTimeout());

        target = position
          ? {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            }
          : null;
      }

      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      // 세 수단이 모두 좌표를 주지 못하면 반드시 알린다 — 조용히 끝내면 버튼이 죽은 것으로 보인다(DST-3).
      // 이 화면은 풀스크린 모달이라 전역 토스트가 모달 뒤에 가려지므로 Alert를 쓴다.
      if (!target) {
        Alert.alert(app.getL10n().t('bagDestination.locationFailedTitle'), app.getL10n().t('app.location.failed'));

        return;
      }

      markUserInteraction();

      Keyboard.dismiss();

      // 현재 위치는 실제 주소를 역지오코딩하도록 알려진 이름을 비운다.
      knownRef.current = null;
      setResultsDismissed(true);
      selectCampLocation(null);
      // 현재 위치로 이동도 명시적인 자유 위치 의사표시라 박지 포커스를 푼다(DST-3).
      focusSpot(null);
      setAddressName('');
      setCenter(target);
      ensureOrigin(target);
      moveCamera(target);
    } catch (error) {
      if (
        savingRef.current ||
        !isCurrentInteraction(visibleGeneration, userInteraction)
      ) {
        return;
      }

      console.error('현재 위치 이동 실패:', error); // l10n-ignore: 개발자 로그
      // 수단이 모두 실패한 경우(위 분기)와 예외는 사용자에게 같은 상황이라 문구를 통일한다(DST-3).
      Alert.alert(app.getL10n().t('bagDestination.locationFailedTitle'), app.getL10n().t('app.location.failed'));
    } finally {
      if (
        mountedRef.current &&
        visibleGenerationRef.current === visibleGeneration
      ) {
        setLocating(false);
      }
    }
  }, [
    ensureOrigin,
    isMapSupported,
    focusSpot,
    isCurrentInteraction,
    locating,
    markUserInteraction,
    moveCamera,
    selectCampLocation,
    startLocationWatch,
  ]);

  // 확정할 여행지. 박지 모드는 참조 + 이름·좌표 스냅샷, 자유 위치는 참조 없이 저장한다(DST-1).
  const buildLocation = useCallback(async (): Promise<BagLocation> => {
    const campLocation = selectedCampLocationRef.current;

    if (campLocation) {
      return campLocation;
    }

    if (addressName) {
      return { name: addressName, ...center };
    }

    // 주소를 아직/끝내 못 찾았어도 확정은 막지 않는다(DST-3).
    try {
      const name = await geocodeService.reverseGeocode(
        center.latitude,
        center.longitude
      );

      return { name: name || FALLBACK_LOCATION_NAME, ...center };
    } catch (error) {
      console.error('역지오코딩 실패:', error); // l10n-ignore: 개발자 로그

      return { name: FALLBACK_LOCATION_NAME, ...center };
    }
  }, [addressName, center]);

  const handleConfirm = useCallback(async () => {
    // 첫 저장이 끝나기 전 추가 탭은 무시한다(DST-6).
    if (savingRef.current || !origin) {
      return;
    }

    const visibleGeneration = visibleGenerationRef.current;

    if (!isCurrentVisibleGeneration(visibleGeneration)) {
      return;
    }

    savingRef.current = true;

    cancelMapReadyFallback();

    if (pendingCameraFrameRef.current !== null) {
      cancelAnimationFrame(pendingCameraFrameRef.current);
      pendingCameraFrameRef.current = null;
    }

    if (
      visibleRef.current &&
      mapReadyRef.current &&
      mapReadyGenerationRef.current === visibleGeneration
    ) {
      mapRef.current?.cancelAnimation();
    }

    setSaving(true);

    let completed = false;

    try {
      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      const location = await buildLocation();

      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      await onConfirm(location);

      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      onDone?.();
      onClose();
      completed = true;
    } catch (error) {
      if (!isCurrentVisibleGeneration(visibleGeneration)) {
        return;
      }

      // 저장 실패 시 선택기를 닫지 않고 재시도할 수 있게 한다(DST-6).
      console.error('여행지 저장 실패:', error); // l10n-ignore: 개발자 로그
      Alert.alert(app.getL10n().t('common.error'), app.getL10n().t('bagDestination.saveFailed'));
    } finally {
      savingRef.current = false;

      if (mountedRef.current) {
        setSaving(false);
      }

      if (!completed && isCurrentVisibleGeneration(visibleGeneration)) {
        schedulePendingCamera(visibleGeneration);
      }
    }
  }, [
    buildLocation,
    cancelMapReadyFallback,
    isCurrentVisibleGeneration,
    mapRef,
    onClose,
    onConfirm,
    onDone,
    origin,
    schedulePendingCamera,
  ]);

  // 박지 상세 시트의 `배낭 여행지로 설정`(DST-3) — 그 박지를 곧바로 확정 저장한다.
  // selectSpot이 selectedCampLocationRef를 동기적으로 채우므로 이어지는 handleConfirm의
  // buildLocation이 지도 중심이 아니라 이 박지를 반환한다.
  // 저장이 끝나면(성공·실패 모두) 선택을 반드시 비운다 — 실패해 선택기가 열린 채 남았을 때
  // 하단 `이 위치로 설정`이 이 박지를 다시 저장해 버리지 않게 하기 위함이다.
  const handleConfirmSpot = useCallback(
    async (spot: CampSpot) => {
      if (savingRef.current) {
        return;
      }

      selectSpot(spot);

      try {
        await handleConfirm();
      } finally {
        selectCampLocation(null);
      }
    },
    [handleConfirm, selectCampLocation, selectSpot]
  );

  return {
    origin,
    viewport,
    focusedSpot,
    addressName,
    resolving,
    saving,
    locating,
    query,
    spotResults,
    placeResults: visiblePlaceResults,
    searchingPlaces,
    resultsVisible,
    handleMapInitialized,
    handleCameraChanged,
    handleFocusSpot,
    handleConfirmSpot,
    handleSelectPlace,
    handleChangeQuery,
    handleFocusSearch,
    handleClearQuery,
    handleTapMap,
    handleMoveToCurrentLocation,
    handleConfirm,
  };
};

export default useBagDestinationPickerState;
