import { FC, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import PretendardText from '@/components/PretendardText';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import ToastView from '@/components/toast/ToastView';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import LoadingView from '@/components/ui/LoadingView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import BagRouteList from '@/model/bag-route/BagRouteList';
import BagRouteCanvasView from './BagRouteCanvasView';
import BagRouteListSectionView from './BagRouteListSectionView';

interface Props {
  bagRouteList: BagRouteList;
}

const IS_IOS = Platform.OS === 'ios';
const IS_WEB = Platform.OS === 'web';
const HEADER_HEIGHT = 52;

/**
 * 배낭 코스 (BD-11) — 지도 + 코스 목록 + 선택한 코스의 고도 그래프.
 *
 * 지도·그래프·목록 행은 그룹 코스 화면(GRP-8·GRP-10)의 것을 그대로 쓴다. 웹은 지도가 없으므로
 * 목록과 그래프만 보여주는 **읽기 전용** 화면이 된다(APP-5) — 파일 선택기가 없어 추가가
 * 불가능한 화면에서 삭제만 여는 것은 균형이 맞지 않는다.
 * iOS는 네이티브 투명 헤더, Android는 커스텀 헤더다(LG-1, 그룹 지도와 같은 관례).
 */
const BagRouteView: FC<Props> = ({ bagRouteList }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  // 어느 코스를 그룹에 올릴지 고르는 중. 연결 그룹이 둘 이상일 때만 시트를 연다.
  const [groupPickTarget, setGroupPickTarget] = useState<BagRoute | null>(null);
  const selected = bagRouteList.getSelectedEntry();

  useFocusEffect(
    useCallback(() => {
      if (bagRouteList.isInitialized()) {
        void bagRouteList.refresh(true);

        return;
      }

      void bagRouteList.initialize();
    }, [bagRouteList])
  );

  const handleBack = () => {
    router.back();
  };

  const handleSelect = useCallback(
    (entry: BagRouteEntry) => {
      bagRouteList.selectEntry(entry.key);
    },
    [bagRouteList]
  );

  const handleDelete = useCallback(
    (route: BagRoute) => {
      app.getAlertManager()?.show({
        message: l10n.t('bag.route.deleteConfirm'),
        confirmText: l10n.t('bag.route.delete'),
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

  const renderList = () => (
    <BagRouteListSectionView
      bagRouteList={bagRouteList}
      onSelect={handleSelect}
      onDelete={handleDelete}
      onUploadToGroup={handleUploadToGroup}
      bottomInset={insets.bottom + 12}
    />
  );

  const renderContent = () => {
    if (!bagRouteList.isInitialized()) {
      return <LoadingView />;
    }

    if (bagRouteList.getError() && bagRouteList.isEmpty()) {
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
              key={selected?.key ?? ''}
              profile={profile}
            />
          ) : null}
          {renderList()}
        </View>
      );
    }

    return (
      <>
        <BagRouteCanvasView bagRouteList={bagRouteList} />
        {renderList()}
      </>
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
