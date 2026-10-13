import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import PointCreateSheetView, {
  PointDraft,
} from '@/components/point/PointCreateSheetView';
import PretendardText from '@/components/PretendardText';
import RouteAddMenuView from '@/components/route/RouteAddMenuView';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import RouteDrawNameSheetView from '@/components/route-draw/RouteDrawNameSheetView';
import useRouteDrawCancel from '@/components/route-draw/useRouteDrawCancel';
import ToastView from '@/components/toast/ToastView';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import LoadingView from '@/components/ui/LoadingView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import BagPointAddVia from '@/model/bag-point/BagPointAddVia';
import { BagPointCoordinate } from '@/model/bag-point/BagPointCoordinate';
import { BagPointEntry } from '@/model/bag-point/BagPointEntry';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import BagRouteList from '@/model/bag-route/BagRouteList';
import BagRouteSelection from '@/model/bag-route/BagRouteSelection';
import { isMapLibreAvailable } from '@/model/map/MapLibreModule';
import RouteDraw from '@/model/route-draw/RouteDraw';
import RouteDrawSource from '@/model/route-draw/RouteDrawSource';
import RouteListSegment from '@/model/route/RouteListSegment';
import BagRouteListSectionView from './BagRouteListSectionView';
import BagRouteMapGateView from './BagRouteMapGateView';
import RouteSegmentChipsView from '@/components/route/RouteSegmentChipsView';
import OfflineUnavailableView from '@/components/offline/OfflineUnavailableView';
import OfflineTripAccess from '@/model/offline/OfflineTripAccess';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
}

// 입력 시트가 등록할 좌표와 그 좌표를 찍은 경로(측정 `via`).
interface PointDraftTarget {
  coordinate: BagPointCoordinate;
  via: BagPointAddVia;
}

const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';
const HEADER_HEIGHT = 52;

/**
 * 배낭 코스 (BD-11) — 지도 + 코스 목록 + 선택한 코스의 고도 그래프. 지도 포인트(BD-14)도 여기 산다.
 * 지도는 온라인·오프라인 모두 같은 `BagRouteMapView`(MapLibre)다 — 오프라인이면 타일이 저장해 둔 팩에서 오고
 * 편집 UI만 걷힌다(OF-6 · MAP-4).
 *
 * 지도·그래프·목록 행은 그룹 코스 화면(GRP-8·GRP-10)의 것을 그대로 쓴다. 웹은 지도가 없으므로
 * 목록과 그래프만 보여주는 **읽기 전용** 화면이 된다(APP-5) — 파일 선택기가 없어 추가가
 * 불가능한 화면에서 삭제만 여는 것은 균형이 맞지 않는다.
 * 포인트도 웹에서는 목록으로만, 읽기 전용으로 보인다(BD-14).
 * iOS는 네이티브 투명 헤더, Android는 커스텀 헤더다(LG-1, 그룹 지도와 같은 관례).
 */
const BagRouteView: FC<Props> = ({ bagRouteList, bagPointList }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  // 어느 코스를 그룹에 올릴지 고르는 중. 연결 그룹이 둘 이상일 때만 시트를 연다.
  const [groupPickTarget, setGroupPickTarget] = useState<BagRoute | null>(null);
  const [segment, setSegment] = useState(RouteListSegment.Routes);
  // 포인트 추가 조준 모드(BD-14). 이 동안 아래 목록이 걷혀 지도를 넓히고 확정 말고 누를 것을 두지 않는다.
  const [isAiming, setIsAiming] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [draftTarget, setDraftTarget] = useState<PointDraftTarget | null>(null);
  const [editingPoint, setEditingPoint] = useState<BagPoint | null>(null);
  // 시트를 열 때마다 올린다 — 시트가 이 값을 `key`로 받아 새로 마운트되면서 입력이 초기화된다.
  const [sheetKey, setSheetKey] = useState(0);
  // `코스 추가` 메뉴(RD-1) — 가져오기 | 지도에서 그리기.
  const [isAddMenuVisible, setIsAddMenuVisible] = useState(false);
  /**
   * 코스 그리기(RD-2 · RD-3) — 화면 수명 동안 하나. 화면을 떠나면 그리던 점과 함께 버려진다(기기 저장 없음).
   * 저장은 가져오기와 같은 목록 경로(`addDrawnRoute`)를 탄다.
   */
  const [routeDraw] = useState(() =>
    RouteDraw.from(RouteDrawSource.Route, {
      submit: (draft, localUri) => bagRouteList.addDrawnRoute(draft, localUri),
      // 모드를 나간 뒤 올린 코스를 골라 카메라를 맞춘다(가져오기와 달리 사용자가 만든 코스라 선택도 기억한다).
      onSaved: routeId => {
        bagRouteList.focusEntry(BagRouteSelection.toBagEntryKey(routeId));
      },
      resolveDefaultName: () => bagRouteList.getDrawDefaultName(),
    })
  );
  const isDrawing = routeDraw.isActive();
  const handleCancelDrawing = useRouteDrawCancel(routeDraw, isDrawing);
  const selected = bagRouteList.getSelectedEntry();
  // OF-6: 연결이 없으면 같은 지도가 저장해 둔 팩에서 뜬다. 열 수 없는 저장본(미저장·잠김)이면 빈 상태다.
  const isOffline = app.getNetworkStatus().isOffline();
  const offlineAccess =
    app.getOfflineTripStore()?.getAccess(bagRouteList.getBagId()) ??
    OfflineTripAccess.NotSaved;
  const wasOfflineRef = useRef(isOffline);
  // 온라인에서 연 화면이면 연결이 끊겨도 읽어 둔 코스를 오프라인 지도로 계속 보여 준다(빈 상태로 바꾸지 않는다).
  const [openedOnline] = useState(() => !isOffline);
  const canUseSnapshot = offlineAccess === OfflineTripAccess.Available;

  // OF-3 · OF-6: 연결이 바뀌면 목록을 다시 읽는다 — 돌아오면 서버 코스(그룹 코스 포함)로, 끊기면 저장본으로.
  // 지도는 그대로 두고(같은 지도다) 편집 UI·상단 안내 줄만 바뀐다.
  useEffect(() => {
    if (wasOfflineRef.current === isOffline) {
      return;
    }

    wasOfflineRef.current = isOffline;

    // 저장본이 없으면 읽어 둔 서버 코스를 그대로 둔다 — 다시 읽으면 빈 목록이 된다.
    if (isOffline && !canUseSnapshot) {
      return;
    }

    void bagRouteList.refresh(true);
    void bagPointList.refresh(true);
  }, [bagPointList, bagRouteList, canUseSnapshot, isOffline]);

  useFocusEffect(
    useCallback(() => {
      // 오프라인인데 저장본이 없으면 읽어 둔 코스를 그대로 둔다(다시 읽으면 빈 목록이 된다 — OF-6).
      const bagId = bagRouteList.getBagId();
      const keepLoaded =
        app.getNetworkStatus().isOffline() &&
        app.getOfflineTripStore()?.getAccess(bagId) !==
          OfflineTripAccess.Available &&
        bagRouteList.isInitialized();

      if (keepLoaded) {
        return;
      }

      if (bagRouteList.isInitialized()) {
        void bagRouteList.refresh(true);
      } else {
        void bagRouteList.initialize();
      }

      if (bagPointList.isInitialized()) {
        void bagPointList.refresh(true);

        return;
      }

      void bagPointList.initialize();
    }, [bagPointList, bagRouteList])
  );

  const handleBack = () => {
    router.back();
  };

  const handleSelect = useCallback(
    (entry: BagRouteEntry) => {
      bagRouteList.focusEntry(entry.key);
    },
    [bagRouteList]
  );

  const handleDelete = useCallback(
    (route: BagRoute) => {
      app.getAlertManager()?.show({
        // 지우는 대상과 함께 사라지는 것(Storage 원본)을 문구에 담는다 — 되돌릴 수 없다.
        message: l10n.t('route.deleteConfirm', { name: route.getName() }),
        confirmText: l10n.t('route.delete'),
        cancelText: l10n.t('common.cancel'),
        destructive: true,
        onConfirm: async () => {
          await bagRouteList.deleteRoute(route);
        },
      });
    },
    [bagRouteList, l10n]
  );

  // 연결 그룹이 하나뿐이면 고를 것이 없다 — 시트를 띄우지 않고 바로 올린다(BD-11).
  const handleUploadToGroup = useCallback(
    (route: BagRoute) => {
      const groups = bagRouteList.getLinkedGroups();

      if (groups.length === 0) {
        return;
      }

      if (groups.length === 1) {
        void bagRouteList.uploadToGroup(route, groups[0].getId());

        return;
      }

      setGroupPickTarget(route);
    },
    [bagRouteList]
  );

  const handleCloseGroupPicker = useCallback(() => {
    setGroupPickTarget(null);
  }, []);

  const handleStartAiming = useCallback(() => {
    setIsAiming(true);
  }, []);

  const handleCancelAiming = useCallback(() => {
    setIsAiming(false);
  }, []);

  // 시트 푸터 `코스 추가` → 메뉴(RD-1). 상한·웹·오프라인이면 버튼이 이미 막혀 있다.
  const handleOpenAddMenu = useCallback(() => {
    setIsAddMenuVisible(true);
  }, []);

  const handleCloseAddMenu = useCallback(() => {
    setIsAddMenuVisible(false);
  }, []);

  // 메뉴 항목은 시트가 다 내려간 뒤 불린다(`BottomMenuModalView` 관례) — 파일 선택기가 시트 위에 겹치지 않는다.
  const handleImportRoute = useCallback(() => {
    void bagRouteList.addRoute();
  }, [bagRouteList]);

  // 그리기 모드에 들어간다(RD-1). 조준 모드와 동시에 켜지지 않는다.
  const handleStartDrawing = useCallback(() => {
    setIsAiming(false);
    routeDraw.start();
  }, [routeDraw]);

  const handleSubmitDrawnRoute = useCallback(
    (name: string) => {
      void routeDraw.save(name);
    },
    [routeDraw]
  );

  const handleRequestCreate = useCallback(
    (coordinate: BagPointCoordinate, via: BagPointAddVia) => {
      // 상한 50이면 입력을 받기 전에 막고 이유를 알린다(BD-14).
      if (bagPointList.isFull()) {
        app.getToastManager()?.showSimple(bagPointList.getLimitMessage());

        return;
      }

      setEditingPoint(null);
      setDraftTarget({ coordinate, via });
      setSheetKey(value => value + 1);
      setIsSheetVisible(true);
    },
    [bagPointList]
  );

  const handleRequestEdit = useCallback((point: BagPoint) => {
    setDraftTarget(null);
    setEditingPoint(point);
    setSheetKey(value => value + 1);
    setIsSheetVisible(true);
  }, []);

  const handleRequestDeletePoint = useCallback(
    (point: BagPoint) => {
      app.getAlertManager()?.show({
        message: l10n.t('group.point.deleteConfirm'),
        confirmText: l10n.t('group.point.delete'),
        cancelText: l10n.t('common.cancel'),
        destructive: true,
        onConfirm: async () => {
          await bagPointList.deletePoint(point);
        },
      });
    },
    [bagPointList, l10n]
  );

  // 목록 행 탭 → 지도가 그 포인트로 옮겨 가고 카드가 뜬다(BD-14).
  const handleSelectPoint = useCallback(
    (entry: BagPointEntry) => {
      bagPointList.focusEntry(entry.key, true);
    },
    [bagPointList]
  );

  const handleCloseSheet = useCallback(() => {
    setIsSheetVisible(false);
    setDraftTarget(null);
    setEditingPoint(null);
  }, []);

  const handleSubmitPoint = useCallback(
    async (draft: PointDraft) => {
      if (editingPoint) {
        const saved = await bagPointList.updatePoint(editingPoint.getId(), {
          type: draft.type,
          title: draft.title,
          description: draft.description || null,
        });

        if (saved) {
          handleCloseSheet();
        }

        return;
      }

      if (!draftTarget) {
        return;
      }

      const created = await bagPointList.createPoint(
        {
          type: draft.type,
          latitude: draftTarget.coordinate.latitude,
          longitude: draftTarget.coordinate.longitude,
          title: draft.title,
          ...(draft.description ? { description: draft.description } : {}),
        },
        draftTarget.via
      );

      if (created) {
        handleCloseSheet();
      }
    },
    [bagPointList, draftTarget, editingPoint, handleCloseSheet]
  );

  const listBottomInset = insets.bottom + 12;

  // `fillHeight`: 네이티브 지도 화면의 바텀 시트 안(BD-11) — 시트 높이를 채우고 세그먼트 줄은 시트 머리가 그린다.
  const renderList = (fillHeight: boolean) => (
    <BagRouteListSectionView
      bagRouteList={bagRouteList}
      bagPointList={bagPointList}
      segment={segment}
      onChangeSegment={setSegment}
      onSelect={handleSelect}
      onDelete={handleDelete}
      onUploadToGroup={handleUploadToGroup}
      // 웹에는 옮겨 갈 지도가 없다 — 포인트 행은 읽기 전용이다(BD-14).
      onSelectPoint={IS_WEB ? undefined : handleSelectPoint}
      onEditPoint={handleRequestEdit}
      onDeletePoint={handleRequestDeletePoint}
      onAddRoute={handleOpenAddMenu}
      bottomInset={listBottomInset}
      fillHeight={fillHeight}
    />
  );

  const renderContent = () => {
    // OF-7: 구독이 끝났거나 저장하지 않은 여행은 오프라인에서 열리지 않는다.
    if (!IS_WEB && isOffline && !canUseSnapshot && !openedOnline) {
      return <OfflineUnavailableView access={offlineAccess} />;
    }

    if (!bagRouteList.isInitialized()) {
      return <LoadingView />;
    }

    if (
      bagRouteList.getError() &&
      bagRouteList.isEmpty() &&
      !bagPointList.hasAny()
    ) {
      return (
        <View style={styles.state}>
          <PretendardText style={styles.stateTitle}>
            {l10n.t('bag.route.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.stateAction}
            onPress={() => void bagRouteList.refresh()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.retry')}
          >
            <PretendardText weight='semibold' style={styles.stateActionLabel}>
              {l10n.t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    if (IS_WEB) {
      const profile = selected?.route.getElevationProfile() ?? null;

      return (
        <View style={styles.webContent}>
          {/* 웹에는 따라 움직일 지도가 없으므로 훑기 제스처를 달지 않는다(GRP-8과 같은 판단). */}
          {profile ? (
            <RouteElevationChartView
              // 방향을 뒤집으면 단면이 바뀌므로 새로 마운트한다(GRP-8).
              key={`${selected?.key ?? ''}:${selected?.route.isReversed() ? 'r' : 'f'}`}
              profile={profile}
              {...(selected
                ? { displayDistance: selected.route.getDistance() }
                : {})}
            />
          ) : null}
          {renderList(false)}
        </View>
      );
    }

    // 지도가 화면을 다 쓰고 그래프·세그먼트·목록은 지도 위 바텀 시트다(BD-11). 조준 모드에서는 시트가 내려간다.
    return (
      <BagRouteMapGateView
        bagRouteList={bagRouteList}
        bagPointList={bagPointList}
        isOffline={isOffline}
        isAiming={isAiming}
        onStartAiming={handleStartAiming}
        onCancelAiming={handleCancelAiming}
        onRequestCreate={handleRequestCreate}
        onRequestEdit={handleRequestEdit}
        onRequestDelete={handleRequestDeletePoint}
        routeDraw={routeDraw}
        onCancelDrawing={handleCancelDrawing}
        // Android는 커스텀 헤더가 레이아웃을 차지해 지도가 이미 그 아래에서 시작한다 — 칩은
        // 지도 위쪽에 살짝 띄우기만 한다. iOS는 투명 헤더라 직접 비운다(그룹 지도와 같다).
        topInset={IS_IOS ? insets.top + HEADER_HEIGHT : 12}
        listHeader={
          <RouteSegmentChipsView
            segment={segment}
            onChangeSegment={setSegment}
          />
        }
        listContent={renderList(true)}
        listBottomInset={listBottomInset}
      />
    );
  };

  // 앱에 전역 `GestureHandlerRootView`가 없다 — 화면마다 필요할 때 직접 감싼다
  // (BagDetailView·GroupMapCanvasView도 같다). 고도 그래프 훑기가 GestureDetector를
  // 쓰므로 이 화면도 감싸야 한다.
  return (
    <GestureHandlerRootView style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {IS_IOS ? null : (
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          <PretendardText
            weight='semibold'
            style={styles.headerTitle}
            numberOfLines={1}
          >
            {l10n.t('bag.route.title')}
          </PretendardText>
          <View style={styles.headerButton} />
        </View>
      )}
      <View style={styles.content}>{renderContent()}</View>
      <BottomMenuModalView
        visible={!!groupPickTarget}
        onClose={handleCloseGroupPicker}
        menuItems={bagRouteList.getLinkedGroups().map(group => ({
          icon: 'people-outline' as const,
          text: group.getName(),
          onPress: () => {
            const route = groupPickTarget;

            if (!route) {
              return;
            }

            void bagRouteList.uploadToGroup(route, group.getId());
          },
        }))}
      />
      <RouteAddMenuView
        visible={isAddMenuVisible}
        // 지도가 없는 옛 바이너리(MAP-1)에서는 그릴 수 없다 — 가져오기만 남는다.
        canDraw={!IS_WEB && isMapLibreAvailable()}
        onClose={handleCloseAddMenu}
        onImport={handleImportRoute}
        onDraw={handleStartDrawing}
      />
      {IS_WEB ? null : (
        <RouteDrawNameSheetView
          key={`route-draw-name-${routeDraw.getNameSheetKey()}`}
          visible={routeDraw.isNameSheetVisible()}
          defaultName={routeDraw.getDefaultName()}
          submitting={routeDraw.isSaving()}
          onClose={() => routeDraw.closeNameSheet()}
          onSubmit={handleSubmitDrawnRoute}
        />
      )}
      {IS_WEB ? null : (
        <PointCreateSheetView
          key={sheetKey}
          visible={isSheetVisible}
          point={editingPoint}
          descriptionPlaceholder={l10n.t('bag.point.descriptionPlaceholder')}
          submitting={bagPointList.isSubmitting()}
          onClose={handleCloseSheet}
          onSubmit={draft => void handleSubmitPoint(draft)}
        />
      )}
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: HEADER_HEIGHT,
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Acg.paper,
  },
  headerButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    ...AcgType.screenTitle,
    color: Acg.ink,
    flex: 1,
    textAlign: 'center',
  },
  // 지도는 풀블리드다 — 좌우 패딩을 주면 지면이 드러난다.
  content: { flex: 1 },
  webContent: { flex: 1, justifyContent: 'flex-end' },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  stateTitle: {
    ...AcgType.body,
    color: Acg.textSecondary,
    textAlign: 'center',
  },
  stateAction: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  stateActionLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(BagRouteView);
