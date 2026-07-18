import { FC, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { NaverMapView, NaverMapViewRef } from '@mj-studio/react-native-naver-map';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius, Spacing } from '@/constants/DesignTokens';
import { BagLocation } from '@/model/bag-destination/BagLocation';
import CampSiteMap from '@/model/camp-site/CampSiteMap';
import { getCampSiteTypeLabel } from '@/model/camp-site/CampSiteLabels';
import CampSiteMapMarkersView from '@/components/camp-site/CampSiteMapMarkersView';
import CampSiteFilterChipsView from '@/components/camp-site/CampSiteFilterChipsView';
import CampSiteDetailOverlayView from '@/components/camp-site/CampSiteDetailOverlayView';
import BagDestinationSearchResultsView from './BagDestinationSearchResultsView';
import useBagDestinationPickerState from './useBagDestinationPickerState';

interface Props {
  // 현재 저장된 여행지. 없으면 미설정 상태로 연다.
  currentLocation: BagLocation | null;
  visible: boolean;
  onClose: () => void;
  // 확정한 여행지의 저장 책임은 호출자에게 있다 — 실패 시 던지면 선택기가 열린 채 유지된다.
  onConfirm: (location: BagLocation) => Promise<void>;
  onDone?: () => void;
}

// 공용 여행지 선택기(DST-3/DST-4). 자유 위치와 등록된 박지를 한 지도에서 고른다.
// 호출 화면과 무관하게 여행지 후보만 만들어 넘기고, 저장·날씨 갱신은 호출자가 맡는다.
const BagDestinationPickerView: FC<Props> = observer(
  ({ currentLocation, visible, onClose, onConfirm, onDone }) => {
    const mapRef = useRef<NaverMapViewRef>(null);
    const [campSiteMap] = useState(() => CampSiteMap.new());
    // 상세 오버레이(DST-3)로 띄울 박지 id. null이면 닫힘.
    const [detailSpotId, setDetailSpotId] = useState<string | null>(null);
    // 웹은 네이티브 지도 SDK를 못 써서 지도 탭(CS-1)과 같은 방식으로 렌더만 건너뛴다.
    // 카카오 장소 검색으로 고른 좌표는 그대로 확정할 수 있어 기존 웹 동작이 유지된다.
    const isMapSupported = Platform.OS !== 'web';

    const {
      origin,
      viewport,
      selectedSpot,
      selectedCampLocation,
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
      handleSelectSpot,
      handleSelectPlace,
      handleChangeQuery,
      handleFocusSearch,
      handleClearQuery,
      handleTapMap,
      handleMoveToCurrentLocation,
      handleConfirm,
    } = useBagDestinationPickerState({
      currentLocation,
      visible,
      onConfirm,
      onClose,
      onDone,
      campSiteMap,
      isMapSupported,
      mapRef,
    });

    const handleClose = () => {
      if (saving) {
        return;
      }

      onClose();
    };

    // 선택기의 ★ 칩(DST-3): 지도 탭과 달리 로그인·빈 상태 가드가 없다. 배낭은 로그인 전용이라
    // 비로그인 상황이 없고, ★ 칩 자체가 즐겨찾기 1건 이상일 때만 노출되므로 단순 토글이면 된다.
    const handleToggleFavorite = () => {
      campSiteMap.setFavoriteOnly(!campSiteMap.isFavoriteOnly());
    };

    return (
      <Modal
        visible={visible}
        animationType='slide'
        onRequestClose={handleClose}
        presentationStyle='fullScreen'
      >
        <SafeAreaProvider>
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
                  selectedSpotId={selectedCampLocation?.campSpotId ?? null}
                  onTapSpot={handleSelectSpot}
                />
              </NaverMapView>
            )}

            {/* 중앙 고정 핀 — 박지를 고른 동안에는 선택 마커 강조에 자리를 내준다. */}
            {isMapSupported && !selectedSpot && (
              <View style={styles.centerPin} pointerEvents='none'>
                <Ionicons
                  name='location'
                  size={40}
                  color={Color.textPrimary}
                  style={styles.pinIcon}
                />
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

            <SafeAreaView edges={['top']} style={styles.headerWrap}>
              <View style={styles.headerCard}>
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={handleClose}
                    disabled={saving}
                    accessibilityRole='button'
                    accessibilityLabel='닫기'
                    accessibilityState={{ disabled: saving }}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Ionicons name='close' size={24} color={Color.textPrimary} />
                  </TouchableOpacity>
                  <PretendardText style={styles.headerTitle} weight='bold'>
                    여행지 선택
                  </PretendardText>
                  <View style={styles.headerButton} />
                </View>

                <View style={styles.searchBox}>
                  <Ionicons name='search' size={18} color={Color.textSecondary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder='박지나 장소를 검색하세요'
                    placeholderTextColor={Color.textSecondary}
                    value={query}
                    onChangeText={handleChangeQuery}
                    onFocus={handleFocusSearch}
                    editable={!saving}
                    autoCorrect={false}
                    returnKeyType='search'
                    accessibilityLabel='박지와 장소 검색'
                    accessibilityState={{ disabled: saving }}
                  />
                  {query.length > 0 && (
                    <TouchableOpacity
                      style={styles.searchClearButton}
                      onPress={handleClearQuery}
                      disabled={saving}
                      accessibilityRole='button'
                      accessibilityLabel='검색어 지우기'
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
                  ★ 칩은 즐겨찾기 1건 이상일 때만 노출하고, 결과 수 토스트는 띄우지 않는다. */}
              {isMapSupported && !resultsVisible && (
                <CampSiteFilterChipsView
                  campSiteMap={campSiteMap}
                  showFavoriteChip={campSiteMap.hasFavorites()}
                  onPressFavorite={handleToggleFavorite}
                />
              )}

              {resultsVisible && (
                <BagDestinationSearchResultsView
                  spots={spotResults}
                  places={placeResults}
                  searchingPlaces={searchingPlaces}
                  onSelectSpot={handleSelectSpot}
                  onSelectPlace={handleSelectPlace}
                />
              )}
            </SafeAreaView>

            <SafeAreaView edges={['bottom']} style={styles.bottomWrap}>
              {isMapSupported && (
                <View style={styles.locateRow}>
                  <TouchableOpacity
                    style={styles.locateButton}
                    onPress={handleMoveToCurrentLocation}
                    disabled={locating || saving}
                    activeOpacity={0.8}
                    accessibilityRole='button'
                    accessibilityLabel='현재 위치로 이동'
                    accessibilityState={{ disabled: locating || saving }}
                  >
                    {locating ? (
                      <ActivityIndicator size='small' color={Color.textPrimary} />
                    ) : (
                      <Ionicons name='locate' size={22} color={Color.textPrimary} />
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.bottomPanel}>
                {selectedCampLocation ? (
                  <View style={styles.infoRow}>
                    <View style={styles.infoText}>
                      <PretendardText
                        style={styles.nameText}
                        weight='medium'
                        numberOfLines={2}
                      >
                        📍 {selectedCampLocation.name}
                      </PretendardText>
                      {selectedSpot && (
                        <PretendardText style={styles.metaText} numberOfLines={1}>
                          {getCampSiteTypeLabel(selectedSpot.type)} ·{' '}
                          {selectedSpot.region}
                        </PretendardText>
                      )}
                    </View>
                    {/* 등록된 박지는 상세(CS-3)를 확인할 수 있게 진입점을 둔다. 선택기 위에
                        시트로 겹쳐 뜨고, 닫으면 선택 상태를 유지한 선택기로 돌아온다(DST-3). */}
                    {selectedCampLocation.campSpotId ? (
                      <TouchableOpacity
                        style={styles.detailLink}
                        onPress={() =>
                          setDetailSpotId(
                            selectedCampLocation.campSpotId ?? null
                          )
                        }
                        activeOpacity={0.7}
                        hitSlop={8}
                        accessibilityRole='button'
                        accessibilityLabel={`${selectedCampLocation.name} 박지 상세 보기`}
                      >
                        <PretendardText
                          style={styles.detailLinkText}
                          weight='medium'
                        >
                          상세
                        </PretendardText>
                        <Ionicons
                          name='chevron-forward'
                          size={16}
                          color={Color.textSecondary}
                        />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.infoRow}>
                    <Ionicons
                      name='location-outline'
                      size={18}
                      color={Color.textPrimary}
                    />
                    <PretendardText
                      style={[styles.nameText, styles.nameTextFill]}
                      weight='medium'
                      numberOfLines={2}
                    >
                      {resolving
                        ? '위치 확인 중…'
                        : addressName || '주소를 찾을 수 없어요'}
                    </PretendardText>
                  </View>
                )}

                <TouchableOpacity
                  style={[
                    styles.confirmButton,
                    (saving || !origin) && styles.confirmDisabled,
                  ]}
                  onPress={handleConfirm}
                  disabled={saving || !origin}
                  activeOpacity={0.8}
                  accessibilityRole='button'
                  accessibilityLabel={
                    selectedCampLocation
                      ? '이 박지로 여행지 설정'
                      : '이 위치로 여행지 설정'
                  }
                  accessibilityState={{ disabled: saving || !origin }}
                >
                  {saving ? (
                    <ActivityIndicator color={Color.background} />
                  ) : (
                    <PretendardText style={styles.confirmText} weight='semibold'>
                      {selectedCampLocation ? '이 박지로 설정' : '이 위치로 설정'}
                    </PretendardText>
                  )}
                </TouchableOpacity>
              </View>
            </SafeAreaView>

            {/* 등록된 박지 상세(CS-3)를 선택기 위에 pageSheet로 겹쳐 띄운다. 닫으면
                선택 상태를 유지한 선택기로 돌아온다(DST-3). 상세의 '배낭 여행지로 설정'은
                배낭 리스트를 열지 않고 이 박지를 현재 배낭에 바로 설정한다(= 이 박지로 설정). */}
            <CampSiteDetailOverlayView
              spotId={detailSpotId}
              onClose={() => setDetailSpotId(null)}
              onSetBag={() => {
                setDetailSpotId(null);
                void handleConfirm();
              }}
            />
          </View>
        </SafeAreaProvider>
      </Modal>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Color.background,
  },
  centerPin: {
    ...StyleSheet.absoluteFillObject,
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
    fontSize: 16,
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
    fontSize: 15,
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
  infoText: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: 15,
    color: Color.textPrimary,
    lineHeight: 20,
  },
  // 자유 위치 패널은 아이콘 옆 가로 배치라 남은 폭을 채운다(박지 패널은 세로 스택).
  nameTextFill: {
    flex: 1,
  },
  metaText: {
    fontSize: 12,
    color: Color.textSecondary,
  },
  detailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 44,
    paddingLeft: 8,
  },
  detailLinkText: {
    fontSize: 14,
    color: Color.textSecondary,
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
    fontSize: 16,
    color: Color.background,
  },
});

export default BagDestinationPickerView;
