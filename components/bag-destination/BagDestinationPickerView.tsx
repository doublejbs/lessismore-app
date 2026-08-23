import { FC, useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  NaverMapView,
  NaverMapViewRef,
} from '@mj-studio/react-native-naver-map';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Color, Radius, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import SpotPinView from '@/components/camp-site/SpotPinView';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { CampSpot } from '@/model/camp-site/CampSpotTypes';
import {
  isCampSiteDetailSheetOpen,
  setCampSiteDetailSheet,
} from '@/model/camp-site/CampSiteDetailSheetHandoff';
import { setCampSiteFavoritesSheet } from '@/model/camp-site/CampSiteFavoritesHandoff';
import CampSiteMapMarkersView from '@/components/camp-site/CampSiteMapMarkersView';
import CampSiteFilterChipsView from '@/components/camp-site/CampSiteFilterChipsView';
import BagDestinationSearchResultsView from './BagDestinationSearchResultsView';
import useBagDestinationPickerState from './useBagDestinationPickerState';

// 즐겨찾기 상징 노랑 — 마커 캠핑장색과 동일한 시맨틱 리터럴(CS-9). 지도 탭 오버레이와 동일.
const FAVORITE_COLOR = '#FFD700';

interface Props {
  // 현재 저장된 여행지. 없으면 미설정 상태로 연다.
  currentLocation: BagLocation | null;
  // 확정한 여행지의 저장 책임은 호출자에게 있다 — 실패 시 던지면 선택기가 열린 채 유지된다.
  onConfirm: (location: BagLocation) => Promise<void>;
  onDone?: (() => void) | undefined;
}

// 공용 여행지 선택기(DST-3/DST-4). 자유 위치와 등록된 박지를 한 지도에서 고른다.
// 호출 화면과 무관하게 여행지 후보만 만들어 넘기고, 저장·날씨 갱신은 호출자가 맡는다.
// 이 컴포넌트는 `/bag-destination-picker` 라우트의 화면이다(DST-3) — 바깥 Modal·SafeAreaProvider는
// 라우트(app/_layout.tsx의 fullScreenModal)가 제공하고, 닫기는 router.back()이다.
const BagDestinationPickerView: FC<Props> = observer(
  ({ currentLocation, onConfirm, onDone }) => {
    const router = useRouter();
    // fullScreenModal 안 네이티브 SafeAreaView는 첫 마운트에 인셋 0으로 측정된 뒤
    // 갱신을 못 받아(초기 진입 시 다이나믹 아일랜드 겹침), 루트 프로바이더의
    // 훅 값(모달 열기 전 확정)으로 패딩을 준다.
    const insets = useSafeAreaInsets();
    const mapRef = useRef<NaverMapViewRef>(null);
    const [campSiteMap] = useState(() => CampSiteMap.new());
    // 박지 시트(상세·즐겨찾기)가 떠 있는지. 떠 있는 동안 하단 자유 위치 UI를 숨긴다(DST-3).
    // 즐겨찾기까지 포함하는 이유: 작은 디텐트에선 하단 패널이 시트 위로 삐져나와 눌릴 수 있다.
    const [sheetOpen, setSheetOpen] = useState(false);
    // 웹은 네이티브 지도 SDK를 못 써서 지도 탭(CS-1)과 같은 방식으로 렌더만 건너뛴다.
    // 카카오 장소 검색으로 고른 좌표는 그대로 확정할 수 있어 기존 웹 동작이 유지된다.
    const isMapSupported = Platform.OS !== 'web';

    // 라우트는 마운트=표시라 상태 훅에는 항상 visible=true를 넘긴다.
    // 상세 시트가 떠 있는 채로 확정되면(상세 CTA 경로) 시트와 선택기를 **한 번의 dismiss로 함께** 닫는다.
    // back()을 두 번 연달아 부르면 첫 dismiss 애니메이션 도중 두 번째가 씹히거나 과하게 pop될 수 있다.
    const handleClosePicker = useCallback(() => {
      if (isCampSiteDetailSheetOpen()) {
        router.dismiss(2);

        return;
      }

      router.back();
    }, [router]);

    const {
      origin,
      viewport,
      focusedSpot,
      addressName,
      resolving,
      saving,
      locating,
      query,
      spotResults,
      placeResults,
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
    } = useBagDestinationPickerState({
      currentLocation,
      visible: true,
      onConfirm,
      onClose: handleClosePicker,
      onDone,
      campSiteMap,
      isMapSupported,
      mapRef,
    });

    const handleClose = () => {
      if (saving) {
        return;
      }

      handleClosePicker();
    };

    // 겹쳐 뜬 박지 상세의 `배낭 여행지로 설정`(DST-3) — 배낭 리스트(CS-5)를 열지 않고 그 박지를
    // 곧바로 확정 저장한다. 시트를 먼저 닫지 않는 이유: 저장 성공 시 handleClosePicker가
    // dismiss(2)로 상세 시트와 선택기를 함께 닫아 연속 back 레이스를 피한다. 저장에 실패하면
    // 아무것도 닫히지 않아 상세가 뜬 채로 재시도할 수 있다(DST-6).
    // Promise를 그대로 돌려줘 상세 CTA가 저장이 끝날 때까지 로딩을 보여줄 수 있게 한다.
    const handleSetBagFromDetail = useCallback(
      async (spot: CampSpot) => {
        await handleConfirmSpot(spot);
      },
      [handleConfirmSpot]
    );

    // 박지 상세(CS-3)를 지도 탭과 동일한 formSheet 라우트로 띄운다(DST-3).
    // 시트는 딤이 없어 뒤 지도를 계속 조작할 수 있다 — 시트가 떠 있는 채 다른 마커를 탭하면
    // 위로 쌓지 않고 기존 시트를 교체한다(CS-2와 동일). forceReplace는 즐겨찾기 시트를
    // 상세로 교체할 때 쓴다.
    const openSpotDetail = useCallback(
      (spot: CampSpot, forceReplace = false) => {
        setCampSiteDetailSheet({
          // 시트를 연 채 지도를 움직였다가 그 박지로 카메라를 되돌린다(CS-2).
          onMoveToSpot: handleFocusSpot,
          // 선택기는 박지 선택 상태를 들고 있지 않아(DST-3) 해제할 강조는 없고, 하단 자유 위치
          // UI를 다시 노출하는 용도로만 쓴다. 시트 교체(replace) 중에는 호출되지 않는다
          // (래퍼가 open 카운터로 마지막 시트가 실제로 닫힐 때만 부른다).
          onClose: () => setSheetOpen(false),
          onSetBag: handleSetBagFromDetail,
        });

        setSheetOpen(true);

        if (forceReplace || isCampSiteDetailSheetOpen()) {
          router.replace(`/camp-site/${spot.id}`);

          return;
        }

        router.push(`/camp-site/${spot.id}`);
      },
      [handleFocusSpot, handleSetBagFromDetail, router]
    );

    // 마커 탭·박지 검색 결과 선택 → 그 박지로 카메라를 옮기고 상세 시트를 띄운다(DST-3).
    // 박지를 "선택"하지는 않는다 — 확정은 상세의 `배낭 여행지로 설정` CTA가 유일한 경로다.
    const handleTapSpot = useCallback(
      (spot: CampSpot) => {
        if (saving) {
          return;
        }

        handleFocusSpot(spot);
        openSpotDetail(spot);
      },
      [handleFocusSpot, openSpotDetail, saving]
    );

    // 즐겨찾기 리스트 항목 본체·우측 상세 버튼 모두 마커 탭과 동일하게 동작한다(CS-9) —
    // 즐겨찾기 시트를 그 박지 상세로 교체(replace)해 시트를 위로 쌓지 않는다.
    const handleTapFavorite = useCallback(
      (spot: CampSpot) => {
        if (saving) {
          return;
        }

        handleFocusSpot(spot);
        openSpotDetail(spot, true);
      },
      [handleFocusSpot, openSpotDetail, saving]
    );

    // 선택기의 ★ 버튼(CS-9): 즐겨찾기 리스트를 지도 탭과 동일한 formSheet 라우트로 연다.
    // 배낭은 로그인 전용이라 비로그인 가드가 없고, ★ 버튼 자체가 즐겨찾기 1건 이상일 때만
    // 노출되므로 빈 상태도 사실상 나오지 않는다. 시트가 떠 있는 동안 지도에는 즐겨찾기
    // 마커만 남기고(favoriteOnly), 시트가 완전히 닫히면 핸드오프의 onClose가 해제한다.
    const handleOpenFavorites = useCallback(() => {
      app.getAnalyticsManager()?.logClick('camp_site_favorites_open');

      campSiteMap.setFavoriteOnly(true);

      setCampSiteFavoritesSheet({
        getSpots: () => campSiteMap.getFavoriteSpots(),
        onOpenDetail: handleTapFavorite,
        onClose: () => {
          campSiteMap.setFavoriteOnly(false);

          // 즐겨찾기를 상세로 replace한 경우엔 이 onClose가 상세가 열린 뒤에 불린다.
          // 그때 플래그를 끄면 상세가 떠 있는데 하단 자유 위치 UI가 되살아난다.
          if (!isCampSiteDetailSheetOpen()) {
            setSheetOpen(false);
          }
        },
      });

      setSheetOpen(true);

      router.push('/camp-site-favorites');
    }, [campSiteMap, handleTapFavorite, router]);

    return (
      <View style={styles.container}>
        {/* 초기 중심이 정해진 뒤에만 지도를 올려 initialCamera를 한 번만 확정한다. */}
        {isMapSupported && origin && (
          <NaverMapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            initialCamera={origin}
            // 기본 줌 버튼/스케일바/현위치 버튼은 이 화면 UI 톤과 달라 숨긴다.
            isShowLocationButton={false}
            isShowZoomControls={false}
            isShowScaleBar={false}
            isScrollGesturesEnabled={!saving}
            isZoomGesturesEnabled={!saving}
            isTiltGesturesEnabled={!saving}
            isRotateGesturesEnabled={!saving}
            isStopGesturesEnabled={!saving}
            onInitialized={handleMapInitialized}
            onTapMap={handleTapMap}
            onCameraChanged={handleCameraChanged}
          >
            <CampSiteMapMarkersView
              campSiteMap={campSiteMap}
              viewport={viewport}
              // 확정 대상 선택 상태는 없다(DST-3) — 강조는 **지금 들여다보는 박지**에만 준다.
              // 배낭에 저장된 박지를 폴백으로 강조하지 않는 이유: 저장 상태는 "선택 중"이
              // 아닌데도 마커가 계속 선택된 것처럼 보여, 포커스 해제 후에도 강조가 남는다.
              selectedSpotId={focusedSpot?.id ?? null}
              onTapSpot={handleTapSpot}
            />
          </NaverMapView>
        )}

        {/* 중앙 고정 핀 — 자유 위치 UI의 일부라 박지 상세가 떠 있는 동안엔 함께 숨긴다(DST-3). */}
        {isMapSupported && !sheetOpen && !focusedSpot && (
          <View style={styles.centerPin} pointerEvents='none'>
            {/* 앱 공통 라임 핀(2026-08-13 사용자 결정) — 지도 탭 선택 마커·배낭 카드
                밴드와 같은 SpotPinView 단일 소스. 잉크 Ionicons 핀은 걷었다. */}
            <View style={styles.pinIcon}>
              <SpotPinView />
            </View>
          </View>
        )}

        {/* 결과가 열려 있을 때 지도 어디를 눌러도 닫히게 한다(검색어는 유지). */}
        {resultsVisible && (
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleTapMap}
            disabled={saving}
          />
        )}

        <View style={[styles.headerWrap, { paddingTop: insets.top }]}>
          <View style={styles.headerCard}>
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={handleClose}
                disabled={saving}
                accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('bagDestination.close')}
                accessibilityState={{ disabled: saving }}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name='close' size={24} color={Color.textPrimary} />
              </TouchableOpacity>
              <PretendardText style={styles.headerTitle} weight='bold'>
                {app.getL10n().t('bagDestination.select')}
              </PretendardText>
              <View style={styles.headerButton} />
            </View>

            <View style={styles.searchBox}>
              <Ionicons name='search' size={18} color={Color.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder={app.getL10n().t('bagDestination.searchPlaceholder')}
                placeholderTextColor={Color.textSecondary}
                value={query}
                onChangeText={handleChangeQuery}
                onFocus={handleFocusSearch}
                editable={!saving}
                autoCorrect={false}
                returnKeyType='search'
                accessibilityLabel={app.getL10n().t('bagDestination.search')}
                accessibilityState={{ disabled: saving }}
              />
              {query.length > 0 && (
                <TouchableOpacity
                  style={styles.searchClearButton}
                  onPress={handleClearQuery}
                  disabled={saving}
                  accessibilityRole='button'
                  accessibilityLabel={app.getL10n().t('bagDestination.clearSearch')}
                  accessibilityState={{ disabled: saving }}
                >
                  <Ionicons
                    name='close-circle'
                    size={18}
                    color={Color.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 지도 탭과 동일한 필터 칩(DST-3) — 검색 카드 아래에 지도 위 오버레이로 얹는다.
              칩은 자체 배경이 있어 지도 위에 떠도 시인성이 유지된다. 결과 드롭다운이 열리면
              드롭다운과 겹치지 않게 숨기고, 마커가 없는 웹에서는 렌더하지 않는다.
              ★ 즐겨찾기는 지도 탭과 동일하게 하단 현재 위치 버튼 위 플로팅 버튼으로 옮겨 칩 행에선 뺀다. */}
          {isMapSupported && !resultsVisible && (
            <CampSiteFilterChipsView campSiteMap={campSiteMap} />
          )}

          {resultsVisible && (
            <BagDestinationSearchResultsView
              spots={spotResults}
              places={placeResults}
              searchingPlaces={searchingPlaces}
              onSelectSpot={handleTapSpot}
              onSelectPlace={handleSelectPlace}
            />
          )}
        </View>

        {/* 박지 상세가 떠 있는 동안엔 하단 자유 위치 UI(주소 + `이 위치로 설정`)와 지도 컨트롤을
            아예 감춘다 — 박지를 고르는 맥락에서 `이 위치로 설정`이 같이 보이면 주 액션이 둘로
            갈라지고(HIG: 화면당 주 액션 1개), 작은 디텐트에선 시트 아래로 비어져 나온다(DST-3). */}
        {!sheetOpen && !focusedSpot && (
          <View style={[styles.bottomWrap, { paddingBottom: insets.bottom }]}>
            {isMapSupported && (
              <View style={styles.locateRow}>
                {/* ★ 즐겨찾기 — 현재 위치 버튼 위(CS-9). 즐겨찾기 1건 이상일 때만 노출한다
                  (배낭은 로그인 전용이라 빈 상태는 사실상 없어 리스트를 곧바로 연다). */}
                {campSiteMap.hasFavorites() && (
                  <TouchableOpacity
                    style={styles.locateButton}
                    onPress={handleOpenFavorites}
                    disabled={saving}
                    activeOpacity={0.8}
                    accessibilityRole='button'
                    accessibilityLabel={app.getL10n().t('bagDestination.favorites')}
                    accessibilityState={{ disabled: saving }}
                  >
                    <Ionicons name='star' size={22} color={FAVORITE_COLOR} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.locateButton}
                  onPress={handleMoveToCurrentLocation}
                  disabled={locating || saving}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={app.getL10n().t('bagDestination.currentLocation')}
                  accessibilityState={{ disabled: locating || saving }}
                >
                  {locating ? (
                    <ActivityIndicator size='small' color={Color.textPrimary} />
                  ) : (
                    <Ionicons
                      name='locate'
                      size={22}
                      color={Color.textPrimary}
                    />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* 하단 패널은 언제나 자유 위치 하나뿐이다(DST-3) — 박지는 상세 시트에서 확정한다. */}
            <View style={styles.bottomPanel}>
              <View style={styles.infoRow}>
                <Ionicons
                  name='location-outline'
                  size={18}
                  color={Color.textPrimary}
                />
                <PretendardText
                  style={styles.nameText}
                  weight='medium'
                  numberOfLines={2}
                >
                  {resolving
                    ? app.getL10n().t('bagDestination.locating')
                    : addressName || app.getL10n().t('bagDestination.addressNotFound')}
                </PretendardText>
              </View>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (saving || !origin) && styles.confirmDisabled,
                ]}
                onPress={handleConfirm}
                disabled={saving || !origin}
                activeOpacity={0.8}
                accessibilityRole='button'
                accessibilityLabel={app.getL10n().t('bagDestination.setLocation')}
                accessibilityState={{ disabled: saving || !origin }}
              >
                {saving ? (
                  <ActivityIndicator color={Color.background} />
                ) : (
                  <PretendardText style={styles.confirmText} weight='semibold'>
                    {app.getL10n().t('bagDestination.setLocationShort')}
                  </PretendardText>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Acg.bg,
  },
  centerPin: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // 핀 끝(하단)이 지도 중심에 오도록 위로 들어올린다.
  pinIcon: {
    marginBottom: 40,
  },
  headerWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerCard: {
    margin: Spacing.item,
    padding: Spacing.item,
    borderRadius: Radius.card,
    backgroundColor: Color.background,
    gap: 10,
    shadowColor: Color.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  headerButton: {
    width: 24,
  },
  headerTitle: {
    ...AcgType.rowSubtitle,
    color: Color.textPrimary,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Color.inputBg,
    borderRadius: Radius.input,
    paddingHorizontal: 14,
    minHeight: 44,
  },
  searchInput: {
    flex: 1,
    // 단일행 입력이라 lineHeight를 얹지 않는다(안드로이드에서 커서 높이가 어긋난다).
    fontSize: AcgType.control.fontSize,
    letterSpacing: AcgType.control.letterSpacing,
    fontFamily: 'Pretendard-Regular',
    color: Color.textPrimary,
    padding: 0,
  },
  searchClearButton: {
    width: 44,
    minHeight: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  bottomWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  locateRow: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 12,
  },
  locateButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Color.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Color.textPrimary,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  bottomPanel: {
    margin: 16,
    padding: 16,
    borderRadius: Radius.modal,
    backgroundColor: Color.background,
    gap: 14,
    shadowColor: Color.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // 아이콘 옆 가로 배치라 남은 폭을 채운다.
  nameText: {
    flex: 1,
    ...AcgType.sectionSubtitle,
    color: Color.textPrimary,
  },
  confirmButton: {
    minHeight: 52,
    borderRadius: Radius.input,
    backgroundColor: Color.chipActiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  confirmDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    ...AcgType.rowSubtitle,
    color: Color.background,
  },
});

export default observer(BagDestinationPickerView);
