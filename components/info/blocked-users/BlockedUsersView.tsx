import { FC } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { observer } from 'mobx-react-lite';
import Layout from '@/components/Layout';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType, Spacing } from '@/constants/DesignTokens';
import BlockedUser from '@/model/block/BlockedUser';
import BlockedUsers from '@/model/blocked-users/BlockedUsers';
import app from '@/model/app/App';
import BlockedUserRowView from './BlockedUserRowView';

interface Props {
  blockedUsers: BlockedUsers;
}

// CM-17 해제 화면 — 차단한 사용자 목록. 정보 탭 하위 화면과 같은 헤더(iOS 네이티브 투명 헤더)를 쓴다.
const BlockedUsersView: FC<Props> = ({ blockedUsers }) => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const users = blockedUsers.getUsers();

  const handleUnblock = (user: BlockedUser) => {
    void blockedUsers.unblock(user);
  };

  const renderContent = () => {
    if (!blockedUsers.isLoggedIn()) {
      return (
        <PretendardText style={styles.emptyText}>
          {l10n.t('moderation.blockedUsers.loginRequired')}
        </PretendardText>
      );
    }

    if (blockedUsers.isLoading()) {
      return <ActivityIndicator style={styles.loading} color={Acg.ink} />;
    }

    if (users.length === 0) {
      return (
        <PretendardText style={styles.emptyText}>
          {l10n.t('moderation.blockedUsers.empty')}
        </PretendardText>
      );
    }

    return users.map((user, index) => (
      <BlockedUserRowView
        key={user.uid}
        user={user}
        isFirst={index === 0}
        isUnblocking={blockedUsers.isUnblocking(user.uid)}
        onUnblock={handleUnblock}
      />
    ));
  };

  return (
    <Layout edges={IS_IOS ? IOS_EDGES : undefined} paddingHorizontal={0}>
      <View style={styles.headerSlot}>
        <InfoSubScreenHeaderView title={l10n.t('moderation.blockedUsers.title')} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          // iOS는 투명 네이티브 헤더가 상단을 덮으므로 그만큼 내려서 시작한다(LG-1).
          IS_IOS && { paddingTop: insets.top + NATIVE_HEADER_HEIGHT + Spacing.item },
        ]}
        contentInsetAdjustmentBehavior='never'
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>
    </Layout>
  );
};

const styles = StyleSheet.create({
  headerSlot: {
    paddingHorizontal: AcgLayout.screenPadding,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: AcgLayout.screenPadding,
    paddingBottom: AcgLayout.scrollBottom,
  },
  loading: {
    marginTop: 40,
  },
  emptyText: {
    ...AcgType.body,
    color: Acg.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
});

export default observer(BlockedUsersView);
