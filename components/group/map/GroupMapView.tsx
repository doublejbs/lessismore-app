import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import GroupStateView from '@/components/group/GroupStateView';
import PretendardText from '@/components/PretendardText';
import ToastView from '@/components/toast/ToastView';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import GroupMap from '@/model/group-map/GroupMap';
import GroupMapCanvasView from './GroupMapCanvasView';
import GroupMapListView from './GroupMapListView';
import GroupPointCreateSheetView, {
  GroupPointDraft,
} from './GroupPointCreateSheetView';

interface Props {
  groupMap: GroupMap;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';
const HEADER_HEIGHT = 52;

/**
 * 그룹 지도 (GRP-9 · GRP-10).
 *
 * 네이티브는 네이버 지도를, 웹은 코스·포인트 목록을 보여준다(APP-5 — 웹은 지도 탭 자체가
 * 없다). 포인트 등록·수정 시트는 두 경로가 함께 쓴다.
 * iOS는 네이티브 투명 헤더, Android는 커스텀 헤더다(GRP-11, LG-1).
 */
const GroupMapView: FC<Props> = ({ groupMap }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const loggedRef = useRef(false);
  const [isSheetVisible, setIsSheetVisible] = useState(false);
  const [draftCoordinate, setDraftCoordinate] = useState<Coordinate | null>(
    null
  );
  const [editingPoint, setEditingPoint] = useState<GroupPoint | null>(null);
  // 시트를 열 때마다 올린다 — 시트가 이 값을 `key`로 받아 새로 마운트되면서 입력이 초기화된다.
  const [sheetKey, setSheetKey] = useState(0);
  const pointList = groupMap.getPointList();
  const group = groupMap.getGroup();

  useEffect(() => {
    if (loggedRef.current) {
      return;
    }

    loggedRef.current = true;
    app.getAnalyticsManager()?.logClick('group_map_open');
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (groupMap.isInitialized()) {
        void groupMap.refresh(true);

        return;
      }

      void groupMap.initialize();
    }, [groupMap])
  );

  const handleBack = () => {
    router.back();
  };

  const handleRequestCreate = useCallback(
    (coordinate: Coordinate) => {
      // 상한 50 초과면 입력을 받기 전에 막고 안내한다(GRP-9).
      if (pointList.isFull()) {
        app
          .getToastManager()
          ?.showSimple(
            getGroupValidationMessage(GroupValidationError.PointLimitExceeded)
          );

        return;
      }

      setEditingPoint(null);
      setDraftCoordinate(coordinate);
      setSheetKey(value => value + 1);
      setIsSheetVisible(true);
    },
    [pointList]
  );

  const handleRequestEdit = useCallback((point: GroupPoint) => {
    setDraftCoordinate(null);
    setEditingPoint(point);
    setSheetKey(value => value + 1);
    setIsSheetVisible(true);
  }, []);

  const handleRequestDelete = useCallback(
    (point: GroupPoint) => {
      app.getAlertManager()?.show({
        message: l10n.t('group.point.deleteConfirm'),
        confirmText: l10n.t('group.point.delete'),
        cancelText: l10n.t('common.cancel'),
        destructive: true,
        onConfirm: async () => {
          if (await pointList.deletePoint(point.getId())) {
            groupMap.focusPoint(null);
          }
        },
      });
    },
    [groupMap, l10n, pointList]
  );

  const handleCloseSheet = useCallback(() => {
    setIsSheetVisible(false);
    setDraftCoordinate(null);
    setEditingPoint(null);
  }, []);

  const handleSubmit = useCallback(
    async (draft: GroupPointDraft) => {
      if (editingPoint) {
        const saved = await pointList.updatePoint(editingPoint.getId(), {
          type: draft.type,
          title: draft.title,
          description: draft.description || null,
        });

        if (saved) {
          handleCloseSheet();
        }

        return;
      }

      if (!draftCoordinate) {
        return;
      }

      const created = await pointList.createPoint({
        type: draft.type,
        latitude: draftCoordinate.latitude,
        longitude: draftCoordinate.longitude,
        title: draft.title,
        ...(draft.description ? { description: draft.description } : {}),
      });

      if (created) {
        handleCloseSheet();
      }
    },
    [draftCoordinate, editingPoint, handleCloseSheet, pointList]
  );

  const renderContent = () => {
    switch (true) {
      case (!groupMap.isInitialized() || groupMap.isLoading()) && !group: {
        return null;
      }
      case groupMap.isNotFound(): {
        return (
          <GroupStateView
            title={l10n.t('group.detail.notFound')}
            actionLabel={l10n.t('group.detail.goBack')}
            onPress={handleBack}
          />
        );
      }
      case groupMap.isNotMember(): {
        return (
          <GroupStateView
            title={l10n.t('group.detail.notMember')}
            actionLabel={l10n.t('group.detail.goBack')}
            onPress={handleBack}
          />
        );
      }
      case !!groupMap.getError() && !group: {
        return (
          <GroupStateView
            title={l10n.t('group.map.loadFailed')}
            actionLabel={l10n.t('common.retry')}
            onPress={() => void groupMap.refresh()}
          />
        );
      }
      case IS_WEB: {
        return (
          <GroupMapListView
            groupMap={groupMap}
            onRequestEdit={handleRequestEdit}
            onRequestDelete={handleRequestDelete}
          />
        );
      }
      default: {
        return (
          <GroupMapCanvasView
            groupMap={groupMap}
            onRequestCreate={handleRequestCreate}
            onRequestEdit={handleRequestEdit}
            onRequestDelete={handleRequestDelete}
            // Android는 커스텀 헤더가 레이아웃을 차지해 지도 영역이 이미 그 아래에서
            // 시작한다 — 칩은 지도 위쪽에 살짝 띄우기만 한다. iOS는 투명 헤더라 직접 비운다.
            topInset={IS_IOS ? insets.top + HEADER_HEIGHT : 12}
          />
        );
      }
    }
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: '',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
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
            {l10n.t('group.map.title')}
          </PretendardText>
          <View style={styles.headerButton} />
        </View>
      )}
      <View style={IS_WEB ? styles.paddedContent : styles.content}>
        {renderContent()}
      </View>
      <GroupPointCreateSheetView
        key={sheetKey}
        visible={isSheetVisible}
        point={editingPoint}
        submitting={pointList.isSubmitting()}
        onClose={handleCloseSheet}
        onSubmit={draft => void handleSubmit(draft)}
      />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
    </View>
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
  paddedContent: { flex: 1, paddingHorizontal: AcgLayout.screenPadding },
});

export default observer(GroupMapView);
