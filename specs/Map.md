# 지도 공통 (지도 공급자·공용 컴포넌트)

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed (2026-10-12 사용자 결정: "그래 지도 전체를 MapLibre로 바꾸자. 근데 지금 작업 다 2.0.2로 하자") |
| ID 프리픽스 | `MAP` |
| 주요 코드 | `[제안]` `components/map/`(`AppMapView` 공용 지도 뷰·`AppMapCamera`, `MapMyLocationMarkerView`, `MapMyLocationButtonView`, `useMyLocationHeadingMode`, `MapAttributionNoteView`), `components/route/`(코스 선·끝점·훑기 마커), `components/point/PointMarkerView`, `components/camp-site/CampSiteMapMarkersView`, `model/map/`(`MapStyle.ts` 스타일 URL·버전, `MapZoom.ts`, `StaticMapImage.ts` 정적 썸네일 생성·캐시, `MapCamera.ts` 카메라 유틸) |
| 관련 스펙 | [CampSite.md](CampSite.md) CS-1·CS-2, [BagDestination.md](BagDestination.md) DST-2·DST-3·DST-8, [BagDetail.md](BagDetail.md) BD-11·BD-14, [Group.md](Group.md) GRP-7·GRP-8·GRP-9·GRP-10, [HealthActivity.md](HealthActivity.md) HA-4, [Bag.md](Bag.md) BAG-1, [Community.md](Community.md)(패킹 스냅샷 지도 밴드), [Offline.md](Offline.md) OF-6, [RouteReplay.md](RouteReplay.md), [AppLifecycle.md](AppLifecycle.md) APP-5 |

## 1. 개요

앱의 모든 지도가 **하나의 공급자·하나의 스타일**을 쓴다 — **MapLibre**(오픈소스 지도 엔진, `@maplibre/maplibre-react-native` 11.x) 위에 **OpenFreeMap** 벡터 타일(OpenStreetMap 데이터, 무료, 키 없음, 오프라인 내려받기 허용) + **AWS Terrain Tiles** 지형 음영을 얹은 자체 스타일 **`useless-outdoor`** 다. 2026-10-12 이전까지 온라인 지도는 네이버 지도 SDK(`@mj-studio/react-native-naver-map`), 목록 썸네일은 NCP Static Map API였다.

**왜 바꾸나.** 오프라인 지도(OF-6)를 MapLibre로 만들면서 온라인 네이버·오프라인 MapLibre 두 벌이 생겼다 — 등고선·음영·한국어 라벨이 오프라인에서만 보이고, 비행기 모드 전환 때 지도가 통째로 바뀐다. 네이버 SDK는 오프라인 타일을 지원하지 않고, 정적 지도는 요청당 과금에 결과 저장 금지 약관이 있으며, NCP 키 만료·401 같은 운영 이슈가 있었다([[naver-map-integration]]). 한 공급자로 묶으면 코드 한 벌, 비용 0, 약관 문제 없음, 그리고 3D 리플레이(RouteReplay)·오프라인 팩과 같은 데이터를 나눠 쓴다.

**잃는 것.** 한국 안 건물·상호·도로 정밀도는 네이버가 낫다. 등산 앱이라 치명적이지 않지만 여행지 선택·박지 주변 편의시설에서 체감될 수 있다(§8). 외부 **길찾기**는 계속 네이버 지도 **앱**으로 연다(`nmap://` 딥링크 — SDK가 아니라 앱 간 링크라 영향 없다, CS-3·GRP-7).

**범위**: 지도 탭(박지), 여행지 선택기, 배낭 코스(온라인·오프라인 통합), 그룹 지도, 그룹 상세 지도 밴드, 운동 기록 경로, 배낭 목록·여행지 타일·허브·스냅샷의 정적 썸네일, 공용 마커·내 위치·카메라. **제외**: 웹(지도 없음, APP-5 그대로), 네이버 지도 **앱** 딥링크, 카카오·네이버 **검색 API**(장소 검색·블로그 후기 — 지도 SDK와 무관).

## 2. 화면 및 진입

지도를 그리는 화면과 그 스펙(진입은 각 도메인 스펙이 정한다):

```text
app/(tabs)/map.tsx            → CampSiteMapView          (CS-1·CS-2)   박지 지도
app/bag-destination-picker    → BagDestinationPickerView (DST-3)       여행지 선택기(중앙 핀 + 박지 마커)
app/bag/[id]/route            → BagRouteMapView          (BD-11·BD-14) 배낭 코스 — 온라인·오프라인 같은 뷰(OF-6)
app/group/[id]/map            → GroupMapCanvasView       (GRP-10)      그룹 지도
app/group/[id]                → GroupDetailMapBandView   (GRP-7)       상세 상단 지도 밴드(비대화형 지도)
app/bag/[id]/activity         → BagActivityRouteMapView  (HA-4)        운동 기록 경로
app/(tabs)/bag · bag/[id] · bag/[id]/weather · 커뮤니티 스냅샷 → 정적 썸네일(MAP-3)
```

## 3. 요구사항

### MAP-1 공급자와 스타일 `[제안]`

**수용 기준**

- 모든 지도 뷰는 스타일 **`useless-outdoor`**(`model/map/MapStyle.ts`의 `MAP_STYLE_URL` = `https://lessismore-7e070.web.app/map/outdoor-v{n}.json`, `MAP_STYLE_VERSION`)를 쓴다. 오프라인 팩(OF-6)·3D 리플레이(RR-2)·정적 썸네일(MAP-3)도 같은 URL이다 — 스타일이 하나라 화면마다 지도 생김새가 같다.
- 스타일 내용: OpenFreeMap `liberty` 기반, 라벨 **한국어 우선**(`name:ko` → 라틴+원어), **지형 음영**(hillshade, 지면 위·수로·도로 아래), 바탕 `#fbfaf8`. 생성 스크립트는 웹 레포(`scripts/`)에 두고 결과 JSON을 `public/map/`에 커밋해 Firebase Hosting으로 서빙한다. **내용을 바꾸면 파일명 버전을 올린다**(오프라인 팩이 URL에 묶인다 — OF-6).
- **출처 표기**(ODbL 의무): 대화형 지도는 MapLibre 기본 attribution 버튼(좌하단 ⓘ — OpenFreeMap · © OpenMapTiles · © OpenStreetMap contributors · AWS Terrain Tiles)을 **숨기지 않는다**. 카드·시트가 그 자리를 덮으면 위치를 비켜 준다(OF-6과 같은 규칙). MapLibre 로고는 의무가 아니라 끈다.
- **키·과금 없음.** `.env`의 NCP 키(`EXPO_PUBLIC_NCP_STATIC_MAP_KEY_ID`)와 `app.json`의 네이버 플러그인·메이븐 저장소는 제거한다(MAP-6).
- 줌 체계: MapLibre와 네이버 SDK 모두 512px 타일 기준 웹 메르카토르라 **기존 줌 값(`MapZoom.ts` `deltaToZoom`, `KOREA_CAMERA`, 동네 줌 13 등)을 그대로 쓴다.**

### MAP-2 공용 지도 컴포넌트 `[제안]`

지도 화면마다 MapLibre를 직접 다루지 않고 `components/map/`의 공용 뷰를 쓴다. 한 곳에서 고치면 전 화면이 따라온다.

**수용 기준**

- **`AppMapView`**: MapLibre `Map` + `Camera`를 감싼 공용 뷰. 기본값 — `mapStyle` = `MAP_STYLE_URL`, 로고 끔, attribution 좌하단, 나침반 우상단(북쪽이면 숨김), **기울이기 끔**(`touchPitch={false}` — 네이티브 MapLibre는 3D 지형이 없다), 회전 허용, 축척 막대는 화면이 켠다. props: `initialCamera`(`center`+`zoom` 또는 `bounds`+`padding`), `onCameraChanged({latitude, longitude, zoom, bearing, reason: 'Gesture'|'Developer'})`(기존 네이버 콜백 모양을 유지해 `useMyLocationHeadingMode`가 그대로 동작), `onPress(coordinate)`, `onLongPress(coordinate)`(네이티브 롱프레스 — `Gesture.LongPress` + `screenToCoordinate` 우회 코드는 지운다), `interactive`(밴드용 false — 제스처 전부 끔), ref: `animateTo({latitude, longitude, zoom?, bearing?, duration})`, `fitBounds(bounds, padding, duration)`, `getCenter()`, `screenToCoordinate(point)`.
- **`AppMapView` 안의 레이어는 세 가지 방식으로 그린다** — 데이터 성격에 따라 고른다:
  1. **`GeoJSONSource` + `Layer`**(선·면·대량 점): 코스 선(`RoutePathLayersView` — 색 `RouteColors`, 선택 6/비선택 4, 흰 테두리), 등고선(OF-6), **박지 마커 수백 개**(CS-2 — `circle` 레이어 유형색 도트 18pt + 흰 2px 테두리, `symbol` 레이어 이름 캡션 `text-field`·`text-halo`, **충돌 숨김은 심볼 배치가 기본으로 한다**(`text-allow-overlap=false` — 네이버 `isHideCollidedCaptions`에 해당), 탭은 `onPress`로 `queryRenderedFeatures`). 뷰포트 밖 렌더 제외는 엔진이 알아서 한다 — CS-2의 "뷰포트 안만 렌더" 수동 필터는 뺀다.
  2. **`Marker`**(실제 RN 뷰, 수십 개 이하): 지도 포인트(`PointMarkerView` — 유형색 원 + 캡션 `PretendardText`), 선택 박지 핀(`SpotPinView`), 출발·도착 말풍선(`RouteEndpointMarkersView` — 이미지 그대로 써도 되고 뷰로 그려도 된다: **MapLibre 마커는 스냅숏이 아니라 실제 뷰**라 글리프 누락·회전 갱신 문제가 없다), 훑기 마커, **내 위치**(`MapMyLocationMarkerView` — 파란 점 + 방향 부채꼴 이미지를 `transform: rotate(heading − bearing)`로 화면 기준 보정), 조준 모드 중앙 핀.
  3. **RN 오버레이**(지도 위 절대 배치): 칩 줄·버튼·카드·펄스 링(CS-2 (A)) — 지금과 같다.
- **`useMyLocationHeadingMode`·`MapMyLocationButtonView`** 는 그대로 쓴다(공급자 무관 훅). 방향 모드의 지도 회전은 `animateTo({bearing})`.
- **카메라 유틸**: `model/route/RouteCamera.ts`(`getRouteFitRegion`·`measureRouteBounds`·`mergeRouteBounds`)는 그대로 두고, `model/map/MapCamera.ts`에 `regionToLngLatBounds`(남서+스팬 → `[w,s,e,n]`), `boundsToLngLatBounds`, `KOREA_CAMERA`(세 화면에 복붙돼 있던 것을 하나로), `CURRENT_LOCATION_DELTA`, `MapCameraChangeReason` enum(`Gesture`·`Control`·`Developer` — 네이버 타입 의존 제거; MapLibre의 `userInteraction`은 `Gesture`, 나머지는 `Developer`)을 둔다. 네이버 `animateCameraTo`의 `pivot`(끝점을 카드 위 빈 자리에 놓기)은 MapLibre `padding`으로 바꾼다.
- 지도 데이터 로드 실패(`onDidFailLoadingMap`): 지도 상단 한 줄 `지도 데이터를 불러오지 못했어요`(OF-6과 같은 문구·컴포넌트), 마커·오버레이는 그대로. 네이버 때의 "10초 안에 초기화 안 되면 캔버스 폴백"(OF-6 폴백) 개념은 사라진다 — 같은 지도라 폴백할 다른 지도가 없다.

### MAP-3 정적 지도 썸네일 `[제안]`

목록·타일·밴드의 지도 이미지는 NCP Static Map URL 대신 **기기에서 MapLibre로 렌더한 PNG**를 쓴다.

**수용 기준**

- `model/map/StaticMapImage.ts`: `getStaticMapImage({ latitude, longitude, zoom, width, height }): Promise<string | null>` — `StaticMapImageManager.createImage({ mapStyle: MAP_STYLE_URL, center: [lng, lat], zoom, width, height(px, 기기 배율 반영), output: 'file', logo: false })`로 PNG 파일을 만들고 **캐시 디렉터리** `cache/map-thumbs/{styleVersion}-{lat5}-{lng5}-{zoom}-{w}x{h}.png`에 둔다. 있으면 바로 돌려주고, 생성은 **동시 2개까지**로 줄 세운다(목록 스크롤에서 수십 장이 한꺼번에 들어온다). 실패·오프라인(타일 못 받음)은 `null` → 호출 화면은 **밴드 없는 폴백**(지금과 같다 — BAG-1 "깨진 이미지·빈 회색 밴드를 남기지 않는다").
- 쓰는 곳과 치수(기존 값 유지): 배낭 목록 카드 밴드(BAG-1 — 폭 = 화면 폭 − 48, 높이 110, 줌 13, `BagItemView`), 커뮤니티 패킹 스냅샷·박지만 있는 그룹 상세 밴드(`SnapshotMapBandView`, 110, 줌 13), 여행지 허브 미리보기(DST-8, `BagDestinationMapPreviewView`, 높이 180, 줌 14). DST-2 타일 썸네일은 스펙에만 있고 구현된 적이 없다(2026-10-12 조사) — 이번에도 넣지 않는다. 마커는 지금처럼 **이미지에 싣지 않고 앱 핀(`SpotPinView`)을 밴드 위에 오버레이**한다.
- **출처 표기**: 정적 PNG에는 attribution이 박히지 않으므로 밴드 **우하단에 `© OpenStreetMap`**(메타 10pt, `Acg.textMuted`, 흰 반투명 바탕)을 얹는다 — ODbL은 지도가 보이는 곳에 출처가 보여야 한다. BAG-1의 "밴드 위에 글자를 얹지 않는다"는 네이버 약관 조항이었으므로 이 한 줄만 예외로 바꾼다.
- NCP 약관 때문에 두었던 제약(결과 저장 금지·로고 자르기 금지·요청당 과금 주의)은 **모두 사라진다** — 기기 캐시에 저장해도 되고, 캐시는 앱 캐시 디렉터리라 OS가 비울 수 있다(없으면 다시 만든다). 서버(Firestore·Storage)에는 여전히 올리지 않는다(필요가 없다).
- 그룹 상세 지도 밴드(GRP-7)는 코스 선·포인트를 그려야 해서 정적 PNG가 아니라 **비대화형 `AppMapView`(`interactive=false`) 1개**를 쓴다 — 한 화면에 하나라 비용 문제가 없다(네이버 때 "뷰 생성당 과금"이 이유였다). 운동 기록 경로(HA-4)도 같다.

### MAP-4 화면별 전환 `[제안]`

각 화면의 **동작 수용 기준은 해당 도메인 스펙이 그대로 유지**하고, 여기에는 공급자 전환으로 달라지는 점만 적는다.

- **박지 지도(CS-1·CS-2)**: 마커 수백 개를 `GeoJSONSource`(circle + symbol 캡션)로 그린다. 선택 박지만 `Marker`(핀 + 캡션 강제 표시). 펄스 링·카메라 이징·시트·필터는 그대로. "뷰포트 밖 마커 미렌더" 수동 최적화와 `isHideCollidedSymbols`(지도 기본 POI 숨김) 우회는 뺀다 — 스타일의 POI 라벨과 마커 캡션이 겹치면 심볼 배치가 둘 중 하나를 숨긴다. 내 위치는 공용 마커.
- **여행지 선택기(DST-3)**: 중앙 고정 핀은 RN 오버레이 그대로, 확정 좌표는 `getCenter()`. 박지 마커는 CS-2와 같은 레이어 컴포넌트를 공유. 포커스 해제 100m 판정은 `onCameraChanged`로 그대로.
- **배낭 코스(BD-11·BD-14)**: 온라인 `BagRouteCanvasView`(네이버)와 오프라인 `OfflineRouteMapView`(MapLibre)를 **하나의 `BagRouteMapView`로 합친다.** 온라인이면 타일을 서버에서, 오프라인이면 팩에서 — 뷰는 같고 분기는 "편집 가능 여부(온라인 + 저장본 아님)"와 "상단 안내 줄"뿐이다. 등고선(저장본의 `contours.json`)은 **온라인에서도 저장본이 있으면 그린다**(같은 지도에서 지형 정보가 켜졌다 꺼졌다 하지 않게). 롱프레스 포인트 추가·조준 모드·`3D` 알약은 온라인에서만. OF-6의 "네이버 폴백" 문구·`OfflineMapReason.MapUnavailable`은 폐기한다.
- **그룹 지도(GRP-10)**: 배낭 코스와 같은 레이어·마커 컴포넌트. 박지 마커는 `Marker`(연결 박지 1개).
- **그룹 상세 밴드(GRP-7)·운동 기록(HA-4)**: 비대화형 `AppMapView` + 코스 선·마커, `fitBounds`.
- **정적 썸네일(BAG-1·DST-2·DST-8·스냅샷)**: MAP-3.
- **3D 리플레이(RR)·오프라인 팩(OF)**: 변경 없음(이미 MapLibre).

### MAP-5 제거 `[제안]`

**수용 기준**

- 의존성 `@mj-studio/react-native-naver-map` 제거, `patch-package`(`patches/`는 이미 없다 — `postinstall`과 devDependency도 제거), `plugins/WithNaverMapNcpKey.js`·`plugins/WithBrotliDedupe.js`(네이버 SDK가 끌어오던 `org.brotli:dec` 충돌 우회 — SDK가 빠지면 필요 없다) 제거, `app.json`의 두 플러그인과 `extraMavenRepos`의 네이버 저장소 제거, `model/map/StaticMapUrl.ts`와 네이버 전용 마커·경로 컴포넌트(`RoutePathOverlayView`·`RouteEndpointMarkersView`·`RouteScrubMarkerView`·`PointMarkerView`·`CampSiteMarkerView`의 네이버 버전) 제거, `.env`·EAS 환경 변수 `EXPO_PUBLIC_NCP_STATIC_MAP_KEY_ID` 제거(EAS `production` 환경에도 있으면 함께). 네이버 우회 코드(`isUseTextureViewAndroid`, 10초 초기화 폴백, 스냅숏 글리프 누락 때문의 PNG 라벨 강제, 방향 모드의 `camera` prop 얼리기)도 함께 걷는다.
- `CLAUDE.md`의 네이버 지도 서술(기술 스택·플랫폼 분기·`naver-map-integration` 메모리 참조)을 MapLibre로 고친다. 스펙의 "네이버 지도" 표현은 각 도메인 스펙에서 `[이력]`으로 남기고 현재 서술을 MapLibre로 바꾼다.
- NCP 콘솔의 Maps 상품·키는 **사용자가 해지**한다(이 스펙 범위 밖 — §8).

### MAP-6 측정 `[제안]`

새 이벤트 없음. 지도 로드 실패는 `map_load_failed`(`logEvent`, `screen`) 하나만 더한다 — 공급자를 바꾼 뒤 타일 서버 장애를 알 수 있어야 한다. [Analytics.md](Analytics.md) AN-3 표에 추가.

## 4. 데이터

- 서버 변경 없음. 스타일 JSON은 웹 레포 `public/map/outdoor-v{n}.json`(Firebase Hosting). 정적 썸네일 캐시는 기기 캐시 디렉터리(MAP-3).
- 데이터 출처·라이선스: OpenFreeMap(OpenMapTiles 스키마, OpenStreetMap ODbL — 출처 표기 의무), AWS Terrain Tiles(Mapzen Terrarium, 공개 데이터). 둘 다 키·과금이 없다. 스프라이트·글리프는 OpenFreeMap 것을 쓴다.

## 5. 플랫폼 분기

- iOS·Android 동일. Android는 MapLibre `opengl` 변형(플러그인 기본). 웹은 지도 없음(APP-5 — 변화 없음).
- 바이너리: **2.0.2 재빌드**(TestFlight 빌드 112 이후)부터. MapLibre 없이 구운 TestFlight 빌드 111·2.0.1 이하에 이 코드를 OTA로 보내면 **모든 지도 화면이 비게 되므로 보내지 않는다**(OF §6의 게이트는 코스 화면만 막는다). 배포 전 `git log <라이브 바이너리 커밋>..HEAD -- package.json app.json`으로 네이티브 변경을 확인하는 기존 규칙(CLAUDE.md) 그대로.

## 6. 엣지 케이스

- **오프라인에서 지도 화면 진입**(저장본 아님): 타일이 없어 지면색만 보인다. 마커·선·내 위치는 그려진다. 네이버 때는 지도가 아예 빈 회색이었으므로 나빠지지 않는다.
- **스타일 서버(Firebase Hosting) 장애**: 지도 데이터 로드 실패 한 줄(MAP-2) + `map_load_failed`. 스타일을 앱 번들에 동봉하는 폴백은 §8.
- **OpenFreeMap 장애·정책 변경**: 단일 무료 공급자 의존이다(§8). 스타일 JSON의 소스 URL만 바꾸면 되므로 공급자 교체는 **스타일 버전 올림 + 호스팅 재배포**로 끝난다(앱 OTA 불필요).
- **정적 썸네일 생성 중 화면 이탈**: 결과를 캐시에만 쓰고 화면 갱신은 하지 않는다(다음 진입 때 즉시).
- **마커 수백 개 + 캡션**: 심볼 레이어라 네이티브가 배치한다. 탭은 `queryRenderedFeatures`로 가장 가까운 피처 하나.

## 7. 수동 검증 체크리스트

- [ ] 지도 탭: 박지 도트·캡션·유형색·필터·선택 핀·펄스·시트·내 위치·현재 위치 버튼 동작, 한국어 지명, 음영, 출처 ⓘ
- [ ] 여행지 선택기: 중앙 핀 좌표 확정, 박지 마커 탭 → 상세 시트, 검색 결과 이동, 100m 이동 시 포커스 해제
- [ ] 배낭 코스(온라인): 코스 선·출발/도착·포인트·롱프레스 추가·조준 모드·`3D`·방향 모드; 저장본이 있으면 등고선; 비행기 모드 → 같은 지도가 팩에서 뜨고 편집만 막힘
- [ ] 그룹 지도·그룹 상세 밴드·운동 기록 경로가 같은 지도 문법으로 보임
- [ ] 배낭 목록 카드 밴드·여행지 타일·허브 미리보기·스냅샷 밴드: 썸네일 생성·캐시(두 번째 진입 즉시)·`© OpenStreetMap` 표기·오프라인 폴백(밴드 없음)
- [ ] `grep -rn "naver-map\|ntruss\|NCP_STATIC" .` 결과 없음(검색 API·`nmap://` 딥링크 제외), 앱 용량 변화 기록
- [ ] Android 실기기: 지도 렌더·마커 탭·회전

## 8. 미해결 질문

- **한국 POI 정밀도**: OSM은 상호·건물이 네이버보다 성글다. 여행지 선택은 카카오 장소 검색이 좌표를 주므로 지도는 배경일 뿐이지만, 박지 주변 편의시설 확인 용도는 약해진다. 실사용 반응을 본다.
- **단일 무료 공급자 의존**: OpenFreeMap이 멈추면 모든 지도가 멈춘다. 대안(MapTiler 유료, 자체 호스팅 PMTiles)은 스타일 소스 URL 교체로 가능 — 장애 시 절차를 문서화할지.
- **스타일 JSON 동봉**: Firebase Hosting 장애에 대비해 앱 번들에 스타일을 함께 두고 URL 실패 시 쓰는 폴백. 오프라인 팩의 스타일 URL 일치 조건과 충돌하므로 보류.
- **NCP 상품 해지 시점**: 2.0.2 재빌드가 스토어에 깔린 뒤 옛 바이너리(2.0.1 이하) 사용자가 남아 있는 동안은 네이버 키를 살려 둬야 한다 — 2.0.0 미만 강제 업데이트 게이트처럼 최소 버전을 2.0.2로 올린 뒤 해지.
- **정적 썸네일 출처 표기 크기**(10pt)가 HIG 가독성 기준(최소 11pt 권장)과 어긋난다 — 디자인 리뷰에서 결정.
