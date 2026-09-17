import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AlertView from '@/components/alert/AlertView';
import CampSiteBagSelectSheetView from '@/components/camp-site/CampSiteBagSelectSheetView';
import BottomMenuModalView from '@/components/ui/BottomMenuModalView';
import ToastView from '@/components/toast/ToastView';
import { Acg, AcgLayout } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupDetail from '@/model/group-detail/GroupDetail';
import GroupStateView from '@/components/group/GroupStateView';
import GroupDetailHeaderView from './GroupDetailHeaderView';
import GroupDetailInviteSectionView from './GroupDetailInviteSectionView';
import GroupDetailPointSectionView from './GroupDetailPointSectionView';
import GroupDetailRouteSectionView from './GroupDetailRouteSectionView';
import GroupDetailSkeletonView from './GroupDetailSkeletonView';
import GroupMemberBagListView from './GroupMemberBagListView';
import useGroupDetailState from './useGroupDetailState';

interface Props {
  detail: GroupDetail;
}

const IS_IOS = Platform.OS === 'ios';
const NATIVE_HEADER_HEIGHT = 44;
const CONTENT_BOTTOM_PADDING = 40;

/**
 * 그룹 상세 (GRP-4 · GRP-5 · GRP-7).
 * 섹션 순서는 헤더 → 멤버·배낭 → 코스 → 포인트 → 초대다.
 * iOS는 네이티브 투명 헤더, Android는 커스텀 헤더를 쓴다(GRP-11, LG-1).
 */
const GroupDetailView: FC<Props> = ({ detail }) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const {
    isMenuVisible,
    isBagSheetVisible,
    isMemberMenuVisible,
    openMenu,
    closeMenu,
    openMemberMenu,
    closeMemberMenu,
    getMemberMenuItems,
    getMenuItems,
    handleBack,
    handleOpenBagSheet,
    handleCloseBagSheet,
    handleSelectBag,
    handleUnlinkBag,
  } = useGroupDetailState(detail);
  const group = detail.getGroup();

  const renderMenuButton = () => {
    if (!group) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.headerButton}
        onPress={openMenu}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('group.detail.menu')}
      >
        <Ionicons name='ellipsis-horizontal' size={24} color={Acg.ink} />
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    switch (true) {
      case (!detail.isInitialized() || detail.isLoading()) && !group: {
        return <GroupDetailSkeletonView />;
      }
      case detail.isNotFound(): {
        return (
          <GroupStateView
            title={l10n.t('group.detail.notFound')}
            actionLabel={l10n.t('group.detail.goBack')}
            onPress={handleBack}
          />
        );
      }
      case detail.isNotMember(): {
        return (
          <GroupStateView
            title={l10n.t('group.detail.notMember')}
            actionLabel={l10n.t('group.detail.goBack')}
            onPress={handleBack}
          />
        );
      }
      case !!detail.getError() && !group: {
        return (
          <GroupStateView
            title={l10n.t('group.detail.loadFailed')}
            actionLabel={l10n.t('common.retry')}
            onPress={() => void detail.refresh()}
          />
        );
      }
      case !!group: {
        return (
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT },
            ]}
            contentInsetAdjustmentBehavior='never'
            showsVerticalScrollIndicator={false}
          >
            <GroupDetailHeaderView detail={detail} />
            <GroupMemberBagListView
              detail={detail}
              onSelectBag={handleOpenBagSheet}
              onUnlinkBag={handleUnlinkBag}
              onOpenMemberMenu={openMemberMenu}
            />
            <GroupDetailRouteSectionView detail={detail} />
            <GroupDetailPointSectionView detail={detail} />
            {group ? <GroupDetailInviteSectionView group={group} /> : null}
          </ScrollView>
        );
      }
      default: {
        return null;
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
          ...(group ? { headerRight: renderMenuButton } : {}),
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
          {renderMenuButton()}
        </View>
      )}
      <View style={styles.content}>{renderContent()}</View>
      <BottomMenuModalView
        visible={isMenuVisible}
        onClose={closeMenu}
        menuItems={getMenuItems()}
      />
      {/* 멤버 행 ⋯ — 방장이 내보낼 멤버를 고른 뒤 뜨는 메뉴다(GRP-4). */}
      <BottomMenuModalView
        visible={isMemberMenuVisible}
        onClose={closeMemberMenu}
        menuItems={getMemberMenuItems()}
      />
      {/* 배낭 선택 시트는 커뮤니티 패킹 첨부가 쓰는 것과 같은 것을 재사용한다(CM-4, GRP-5). */}
      <CampSiteBagSelectSheetView
        visible={isBagSheetVisible}
        bags={detail.getMyBags()}
        spotName=''
        subtitleOverride={l10n.t('group.detail.bagSheetSubtitle')}
        emptyText={l10n.t('group.detail.bagSheetEmpty')}
        hideCreateNew
        onClose={handleCloseBagSheet}
        onSelect={handleSelectBag}
        onCreateNew={handleCloseBagSheet}
      />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
      <AlertView alertManager={app.getAlertManager()!} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Acg.paper },
  header: {
    minHeight: 52,
    paddingHorizontal: AcgLayout.screenPadding,
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
  content: { flex: 1, paddingHorizontal: AcgLayout.screenPadding },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: CONTENT_BOTTOM_PADDING,
  },
});

export default observer(GroupDetailView);
