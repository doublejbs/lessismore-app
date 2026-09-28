import { FC, useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useRouter } from 'expo-router';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import GroupList from '@/model/group-list/GroupList';
import FloatingPillButton from '@/components/FloatingPillButton';
import GroupStateActionVariant from '@/components/group/GroupStateActionVariant';
import GroupStateView from '@/components/group/GroupStateView';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import {
  FLOATING_ACTION_RIGHT,
  getFloatingActionBottom,
  getFloatingActionListBottomPadding,
} from '@/constants/FloatingAction';
import GroupListRowView from './GroupListRowView';
import GroupListSkeletonView from './GroupListSkeletonView';

interface Props {
  groupList: GroupList;
}

/**
 * 그룹 목록 (GRP-1). 배낭 탭 `그룹` 세그먼트 안에서 렌더된다 — 별도 라우트가 아니다.
 *
 * 주 액션 `그룹 만들기`는 배낭 탭 `배낭 추가`와 같은 자리·크기의 플로팅 알약이다(BAG-1).
 * **라임은 화면당 하나**라, 빈 상태·오류·로그인 유도처럼 본문이 스스로 액션을 들고 있는
 * 상태에서는 플로팅 알약을 띄우지 않는다.
 */
const GroupListView: FC<Props> = ({ groupList }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const isLoggedIn = app.getFirebase().isLoggedIn();
  const isLoading = groupList.getIsLoading();
  const error = groupList.getError();
  const upcomingGroups = groupList.getUpcomingGroups();
  const pastGroups = groupList.getPastGroups();
  const hasGroups = !groupList.isEmpty();

  useFocusEffect(
    useCallback(() => {
      if (groupList.getIsInitialized()) {
        void groupList.refresh(true);
      }
    }, [groupList])
  );

  // 로그인 모달은 화면을 떠나지 않으므로 포커스 이벤트가 오지 않는다 — 로그인 상태가
  // 바뀌는 순간 첫 조회를 시작하고, 로그아웃되면 목록을 비운다.
  useEffect(() => {
    if (isLoggedIn) {
      void groupList.initialize();

      return;
    }

    groupList.reset();
  }, [groupList, isLoggedIn]);

  const handleCreate = () => {
    if (!isLoggedIn) {
      app.getLogInAlertManager()?.show();

      return;
    }

    router.push('/group/new');
  };

  const handleLogIn = () => {
    app.getLogInAlertManager()?.show();
  };

  const handleRetry = () => {
    void groupList.refresh();
  };

  const renderLogInPrompt = () => (
    <GroupStateView
      title={l10n.t('group.list.loginTitle')}
      actionLabel={l10n.t('group.list.login')}
      onPress={handleLogIn}
      variant={GroupStateActionVariant.Primary}
      raised
    />
  );

  const renderError = () => (
    <GroupStateView
      title={l10n.t('group.list.loadFailed')}
      actionLabel={l10n.t('common.retry')}
      onPress={handleRetry}
      raised
    />
  );

  const renderEmpty = () => (
    <GroupStateView
      title={l10n.t('group.list.emptyTitle')}
      actionLabel={l10n.t('group.list.create')}
      onPress={handleCreate}
      variant={GroupStateActionVariant.Primary}
      raised
    />
  );

  const renderSection = (title: string | null, groups: Group[]) => {
    if (!groups.length) {
      return null;
    }

    return (
      <View style={styles.section}>
        {title ? <AcgSectionHeaderView title={title} /> : null}
        {groups.map((group, index) => (
          <GroupListRowView
            key={group.getId()}
            group={group}
            divided={index > 0}
          />
        ))}
      </View>
    );
  };

  const renderList = () => (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingBottom: getFloatingActionListBottomPadding(insets.bottom) },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {renderSection(null, upcomingGroups)}
      {renderSection(l10n.t('group.list.pastSection'), pastGroups)}
    </ScrollView>
  );

  const renderContent = () => {
    switch (true) {
      case !isLoggedIn: {
        return renderLogInPrompt();
      }
      case isLoading && !hasGroups: {
        return <GroupListSkeletonView />;
      }
      case !!error && !hasGroups: {
        return renderError();
      }
      case !hasGroups: {
        return renderEmpty();
      }
      default: {
        return renderList();
      }
    }
  };

  return (
    <>
      {renderContent()}
      {isLoggedIn && hasGroups && (
        <FloatingPillButton
          label={l10n.t('group.list.create')}
          onPress={handleCreate}
          variant='primary'
          style={[
            styles.floatingButton,
            { bottom: getFloatingActionBottom(insets.bottom) },
          ]}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  // 첫 구간은 머리가 없으므로 아래 구간만 벌린다 — 배낭 목록 구간 리듬과 같다.
  section: {
    marginBottom: 26,
  },
  floatingButton: {
    position: 'absolute',
    right: FLOATING_ACTION_RIGHT,
  },
});

export default observer(GroupListView);
