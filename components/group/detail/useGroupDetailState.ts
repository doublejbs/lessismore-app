import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';
import GroupDetail from '@/model/group-detail/GroupDetail';
import GroupMember from '@/model/group/GroupMember';
import GroupPointDispatcher from '@/model/group-point/GroupPointDispatcher';
import GroupPointList from '@/model/group-point/GroupPointList';
import GroupRouteDispatcher from '@/model/group-route/GroupRouteDispatcher';
import GroupRouteList from '@/model/group-route/GroupRouteList';

// Android 시트는 투명 Modal이라 닫히는 중에 알럿을 띄워도 겹치지 않는다. iOS pageSheet·웹은 다 내려간 뒤에 잇는다.
const WAITS_SHEET_DISMISS = Platform.OS !== 'android';

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
  const [isMemberMenuVisible, setIsMemberMenuVisible] = useState(false);
  /**
   * 멤버 행 ⋯ 메뉴의 대상. 행마다 `⋯`는 하나뿐이고 무엇이 들어가는지는 대상이 정한다(GRP-11):
   * **내 행**이면 배낭 변경·해제, **방장이 보는 다른 멤버 행**이면 내보내기(GRP-4).
   * 닫을 때 비우지 않는다 — 시트가 슬라이드로 내려가는 동안 항목이 사라져 깜빡인다.
   */
  const [memberMenuTarget, setMemberMenuTarget] = useState<GroupMember | null>(
    null
  );
  // 시트에서 고른 배낭. 연결 흐름은 옮기기·일정 맞춤 알럿을 띄울 수 있어 시트가 다 내려간 뒤 시작한다(GRP-5).
  const pendingBagRef = useRef<BagItem | null>(null);

  /**
   * 코스·포인트 목록은 상단 지도 밴드와 그 아래 개수 줄(GRP-7)이 함께 쓴다 — 상세에 코스·포인트
   * 섹션은 없고(2026-09-25) 관리는 그룹 지도가 한다. 밴드의 빈 밴드 판정이 두 목록을 다 읽은 뒤에만
   * 서므로 화면이 둘을 함께 들고 포커스마다 다시 읽는다.
   */
  const groupId = detail.getGroupId();
  const [routeList] = useState(() =>
    GroupRouteList.from(GroupRouteDispatcher.new(), groupId)
  );
  const [pointList] = useState(() =>
    GroupPointList.from(GroupPointDispatcher.new(), groupId)
  );

  useFocusEffect(
    useCallback(() => {
      if (detail.isInitialized()) {
        void detail.refresh(true);
      } else {
        void detail.initialize();
      }

      if (!groupId) {
        return;
      }

      // 지도에서 코스·포인트를 더하고 돌아오면 조용히 다시 읽는다(첫 진입만 로딩 상태를 탄다).
      [routeList, pointList].forEach(list => {
        if (list.isInitialized()) {
          void list.refresh(true);

          return;
        }

        void list.initialize();
      });
    }, [detail, groupId, pointList, routeList])
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

    if (WAITS_SHEET_DISMISS) {
      pendingBagRef.current = bag;

      return;
    }

    void detail.linkBag(bag);
  };

  const handleBagSheetDismissed = () => {
    const bag = pendingBagRef.current;

    pendingBagRef.current = null;

    if (bag) {
      void detail.linkBag(bag);
    }
  };

  /**
   * 배낭 연결 해제 (GRP-5 · GRP-11). 일행 합계에서 내 배낭이 빠지는 액션이라 파괴적 표시를 주고,
   * 확인 버튼에 결과(`해제`)를 적는다 — `확인`만 적힌 버튼은 무엇이 일어나는지 말하지 않는다(HIG).
   */
  const handleUnlinkBag = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.unlinkConfirm'),
      confirmText: l10n.t('group.detail.unlinkBag'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
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

  // 확인 버튼에 결과를 적는다 — `확인`만 적힌 버튼은 무엇이 일어나는지 말하지 않는다(HIG).
  const handleLeave = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.leaveConfirm'),
      confirmText: l10n.t('group.detail.leaveGroup'),
      cancelText: l10n.t('common.cancel'),
      onConfirm: async () => {
        if (await detail.leaveGroup()) {
          router.back();
        }
      },
    });
  };

  /**
   * 그룹 해산 (GRP-7). 그룹·멤버·배낭 스냅샷·포인트·코스·Storage GPX가 **전원분** 사라지는
   * 되돌릴 수 없는 액션이라, 포인트 하나 지우기·멤버 내보내기와 같은 파괴적 표시를 준다.
   */
  const handleDelete = () => {
    app.getAlertManager()?.show({
      message: l10n.t('group.detail.deleteConfirm'),
      confirmText: l10n.t('group.detail.deleteGroup'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        if (await detail.deleteGroup()) {
          router.back();
        }
      },
    });
  };

  /**
   * 멤버 내보내기 (GRP-4 · GRP-12). 파괴적 액션이라 확인 알럿을 한 번 거치고,
   * 배낭 스냅샷이 함께 사라진다는 것을 문구에 담는다. 실패는 모델이 토스트로 알린다.
   */
  const handleRemoveMember = (member: GroupMember) => {
    app.getAlertManager()?.show({
      message: l10n.t('group.member.removeConfirm', {
        nickname: member.getNickname(),
      }),
      confirmText: l10n.t('group.member.remove'),
      cancelText: l10n.t('common.cancel'),
      destructive: true,
      onConfirm: async () => {
        await detail.removeMember(member.getUid());
      },
    });
  };

  const getMemberMenuItems = (): MenuItem[] => {
    if (!memberMenuTarget) {
      return [];
    }

    const target = memberMenuTarget;

    // 내 행 — 배낭 변경·해제(GRP-11). 연결 전 행에는 `⋯`가 없고 `연결`이 바로 선다.
    if (target.getUid() === detail.getUserId()) {
      return [
        {
          icon: 'swap-horizontal-outline',
          text: l10n.t('group.detail.changeBag'),
          onPress: handleOpenBagSheet,
        },
        {
          icon: 'unlink-outline',
          text: l10n.t('group.detail.unlinkBag'),
          onPress: handleUnlinkBag,
        },
      ];
    }

    return [
      {
        icon: 'person-remove-outline',
        text: l10n.t('group.member.remove'),
        onPress: () => handleRemoveMember(target),
      },
    ];
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
    routeList,
    pointList,
    isMenuVisible,
    isBagSheetVisible,
    isMemberMenuVisible,
    openMenu: () => setIsMenuVisible(true),
    closeMenu: () => setIsMenuVisible(false),
    openMemberMenu: (member: GroupMember) => {
      setMemberMenuTarget(member);
      setIsMemberMenuVisible(true);
    },
    closeMemberMenu: () => setIsMemberMenuVisible(false),
    getMemberMenuItems,
    getMenuItems,
    handleBack,
    handleOpenBagSheet,
    handleCloseBagSheet,
    handleSelectBag,
    handleBagSheetDismissed,
  };
};

export default useGroupDetailState;
