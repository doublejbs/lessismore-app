import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import GroupDetail from '@/model/group-detail/GroupDetail';

interface MenuItem {
  readonly icon: keyof typeof Ionicons.glyphMap;
  readonly text: string;
  readonly onPress: () => void;
}

/**
 * 그룹 상세의 상태·핸들러 (GRP-4 · GRP-5 · GRP-12).
 * 뷰는 렌더만 하고 조회·확인 알럿·이동은 여기 모은다.
 */
const useGroupDetailState = (detail: GroupDetail) => {
  const router = useRouter();
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isBagSheetVisible, setIsBagSheetVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (detail.isInitialized()) {
        void detail.refresh(true);

        return;
      }

      void detail.initialize();
    }, [detail])
  );

  const group = detail.getGroup();
  const l10n = app.getL10n();

  const handleBack = () => {
    router.back();
  };

  const handleOpenBagSheet = () => {
    setIsBagSheetVisible(true);
    void detail.loadMyBags();
  };

  const handleCloseBagSheet = () => {
    setIsBagSheetVisible(false);
  };

  const handleSelectBag = (bag: BagItem) => {
    setIsBagSheetVisible(false);
    void detail.linkBag(bag);
  };

  const handleUnlinkBag = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.unlinkConfirm'),
      confirmText: l10n.t('common.confirm'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        await detail.unlinkBag();
      },
    });
  };

  const handleEdit = () => {
    router.push({
      pathname: '/group/[id]/edit',
      params: { id: detail.getGroupId() },
    });
  };

  const handleToggleInvite = () => {
    if (!group) {
      return;
    }

    void detail.setInviteEnabled(!group.getInviteEnabled());
  };

  const handleLeave = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.leaveConfirm'),
      confirmText: l10n.t('common.confirm'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        if (await detail.leaveGroup()) {
          router.back();
        }
      },
    });
  };

  const handleDelete = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.deleteConfirm'),
      confirmText: l10n.t('common.confirm'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        if (await detail.deleteGroup()) {
          router.back();
        }
      },
    });
  };

  const getMenuItems = (): MenuItem[] => {
    if (!detail.isOwner()) {
      return [
        {
          icon: 'exit-outline',
          text: l10n.t('group.detail.leaveGroup'),
          onPress: handleLeave,
        },
      ];
    }

    const inviteEnabled = group?.getInviteEnabled() !== false;

    return [
      {
        icon: 'create-outline',
        text: l10n.t('group.detail.editGroup'),
        onPress: handleEdit,
      },
      {
        icon: inviteEnabled ? 'lock-closed-outline' : 'lock-open-outline',
        text: l10n.t(
          inviteEnabled ? 'group.detail.lockInvite' : 'group.detail.unlockInvite'
        ),
        onPress: handleToggleInvite,
      },
      {
        icon: 'trash-outline',
        text: l10n.t('group.detail.deleteGroup'),
        onPress: handleDelete,
      },
    ];
  };

  return {
    isMenuVisible,
    isBagSheetVisible,
    openMenu: () => setIsMenuVisible(true),
    closeMenu: () => setIsMenuVisible(false),
    getMenuItems,
    handleBack,
    handleOpenBagSheet,
    handleCloseBagSheet,
    handleSelectBag,
    handleUnlinkBag,
  };
};

export default useGroupDetailState;
