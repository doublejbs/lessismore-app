import { FC, useCallback, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PretendardText from '@/components/PretendardText';
import { AcgLayout, AcgType, Color, Radius } from '@/constants/DesignTokens';
import useSheetTransition from '@/hooks/useSheetTransition';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import GroupMap from '@/model/group-map/GroupMap';

interface Props {
  visible: boolean;
  groupMap: GroupMap;
  onSelect: (route: GroupRoute) => void;
  onDelete: (route: GroupRoute) => void;
  onClose: () => void;
  /**
   * 시트가 **다 내려간 뒤** 불린다. 시트 안 `⋯`의 삭제는 확인 알럿으로 이어지는데, 알럿은 화면에
   * 붙은 모달이라 시트가 떠 있는 동안에는 뜨지 않는다 — 화면이 여기서 이어 간다.
   * 처음 마운트될 때(닫힌 상태로 전환이 한 번 돈다)에도 불릴 수 있어, 이어 갈 일이 없으면 아무것도 하지 않아야 한다.
   */
  onDismissed: () => void;
}

// 시트가 화면 아래로 빠지는 거리. 코스 5개(행 72pt)에 제목·닫기를 더한 높이보다 크다.
const SHEET_SLIDE_OFFSET = 600;
const CLOSE_BUTTON_HEIGHT = 52;

/**
 * 그룹 지도의 코스 목록 시트 (GRP-10).
 *
 * 목록은 배낭 코스 화면과 같은 공용 행(`GroupRouteListView` → `RouteListView`)이다 — 선택 막대,
 * 행 `⋯` 메뉴의 방향 뒤집기·삭제(삭제는 올린 사람·방장만). 행을 누르면 그 코스를 고르고 시트를
 * 닫는다(카메라 이동은 화면이 `focusRoute`로 요청한다).
 *
 * 시트 문법은 `BottomMenuModalView`와 같다 — 딤 + 내용 높이만큼 올라오는 하단 시트, 모서리 `sheet`,
 * 맨 아래 `닫기` 알약. 코스는 최대 5개라 화면 전체를 덮는 pageSheet는 빈 면만 남긴다.
 * 행 `⋯`의 메뉴 시트는 이 시트 **안에서** 열린다(모달 위 모달).
 */
const GroupRouteListSheetView: FC<Props> = ({
  visible,
  groupMap,
  onSelect,
  onDelete,
  onClose,
  onDismissed,
}) => {
  const l10n = app.getL10n();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(SHEET_SLIDE_OFFSET));
  const routeList = groupMap.getRouteList();
  const group = groupMap.getGroup();

  const handleCloseComplete = useCallback(() => {
    setMounted(false);
    // Modal의 visible 해제가 반영된 다음 후속 알럿을 연다(`BottomMenuModalView`와 같은 순서).
    setTimeout(onDismissed, 0);
  }, [onDismissed]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      setMounted(true);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [visible]);

  useSheetTransition({
    visible,
    fadeAnim,
    slideAnim,
    slideOffset: SHEET_SLIDE_OFFSET,
    onCloseComplete: handleCloseComplete,
  });

  return (
    <Modal
      visible={mounted || visible}
      transparent
      animationType='none'
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={styles.overlayTouchable}
          activeOpacity={1}
          onPress={onClose}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('common.close')}
        />
        <Animated.View
          style={[styles.content, { transform: [{ translateY: slideAnim }] }]}
        >
          <PretendardText weight='semibold' style={styles.title}>
            {l10n.t('group.detail.routesTitle')}
          </PretendardText>
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            <GroupRouteListView
              routes={routeList.getRoutes()}
              memberIds={groupMap.getMemberIds()}
              selectedRouteId={groupMap.getSelectedRouteId()}
              onSelect={onSelect}
              onDelete={onDelete}
              canDelete={route => routeList.canDelete(route, group)}
              disabled={routeList.isSubmitting()}
            />
          </ScrollView>
          <View
            style={[
              styles.closeSection,
              { paddingBottom: Math.max(insets.bottom - 16, 12) },
            ]}
          >
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              accessibilityRole='button'
            >
              <PretendardText weight='bold' style={styles.closeLabel}>
                {l10n.t('common.close')}
              </PretendardText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// 치수·색은 `BottomMenuModalView`와 같다 — 앱의 하단 시트가 한 모양으로 보인다.
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Color.overlay,
    justifyContent: 'flex-end',
  },
  overlayTouchable: {
    flex: 1,
  },
  content: {
    maxHeight: '85%',
    backgroundColor: Color.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingTop: 20,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Color.textPrimary,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: 8,
  },
  // 내용 높이만큼만 차지하고, 최대 높이 안에서만 줄어든다.
  list: {
    flexGrow: 0,
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  closeSection: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  closeButton: {
    width: '100%',
    backgroundColor: Color.chipActiveBg,
    // 알약 — 모서리는 높이의 절반(HM-8).
    borderRadius: CLOSE_BUTTON_HEIGHT / 2,
    minHeight: CLOSE_BUTTON_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeLabel: {
    ...AcgType.control,
    color: Color.background,
  },
});

export default observer(GroupRouteListSheetView);
