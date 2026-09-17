import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import app from '@/model/app/App';
import PretendardText from '@/components/PretendardText';
import AcgDisplayText from '@/components/acg/AcgDisplayText';
import AlertView from '@/components/alert/AlertView';
import LogInView from '@/components/login/LogInView';
import LoadingView from '@/components/ui/LoadingView';
import ToastView from '@/components/toast/ToastView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import GroupError from '@/model/group/GroupError';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupErrorMessage } from '@/model/group-error/GroupErrorMessage';
import GroupJoin from '@/model/group-join/GroupJoin';
import GroupJoinStatus from '@/model/group-join/GroupJoinStatus';

interface Props {
  groupJoin: GroupJoin;
  groupId: string;
}

const IS_IOS = Platform.OS === 'ios';
const NATIVE_HEADER_HEIGHT = 44;

// 안내만 있는 상태들. 그룹 요약을 그릴 것이 없어 문구 + 돌아가기/다시 시도만 보인다.
const MESSAGE_KEY_BY_STATUS: Partial<Record<GroupJoinStatus, string>> = {
  [GroupJoinStatus.NotFound]: 'group.join.notFound',
  [GroupJoinStatus.InvalidLink]: 'group.join.invalidLink',
  [GroupJoinStatus.LoadFailed]: 'group.list.loadFailed',
  [GroupJoinStatus.NeedLogin]: 'group.join.loginTitle',
};

/**
 * 초대 수락 화면 (GRP-3).
 * 그룹 이름·기간·여행지·멤버 수를 먼저 보여주고 `참여하기`를 눌러야 멤버가 된다.
 */
const GroupJoinView: FC<Props> = ({ groupJoin, groupId }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const status = groupJoin.getStatus();
  const group = groupJoin.getGroup();
  const isJoining = groupJoin.getIsJoining();
  const messageKey = MESSAGE_KEY_BY_STATUS[status];
  // 기간 표기는 배낭·그룹 목록과 같은 단일 소스를 쓴다 — 로케일마다 형식이 다르다.
  const dateFormat = l10n.t('bag.dateShortFormat');
  const dateText = group
    ? `${dayjs(group.getStartDate()).format(dateFormat)}${l10n.t('bag.dateRangeSeparator')}${dayjs(group.getEndDate()).format(dateFormat)}`
    : '';
  const destinationName = group?.getDestinationName();
  const metaParts = group
    ? [
        ...(destinationName ? [destinationName] : []),
        l10n.t('group.list.memberCount', { count: group.getMemberCount() }),
      ]
    : [];
  const metaText = metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : '';
  const noticeKey =
    status === GroupJoinStatus.Full
      ? 'group.join.full'
      : status === GroupJoinStatus.InviteDisabled
        ? 'group.join.inviteDisabled'
        : null;

  const handleJoin = async () => {
    try {
      const joinedId = await groupJoin.join();

      if (!joinedId) {
        return;
      }

      app.getAnalyticsManager()?.logClick('group_join', {
        // 참여 후 인원이다(Analytics 그룹 표).
        member_count: (group?.getMemberCount() ?? 0) + 1,
      });
      router.replace({ pathname: '/group/[id]', params: { id: joinedId } });
    } catch (error) {
      app.getToastManager()?.show({ message: getGroupErrorMessage(error) });

      if (
        error instanceof GroupError &&
        error.code === GroupValidationError.AlreadyMember
      ) {
        router.replace({ pathname: '/group/[id]', params: { id: groupId } });

        return;
      }

      // 정원·잠금은 내가 보고 있는 사이에 바뀔 수 있다 — 상태를 다시 읽어 화면을 맞춘다.
      void groupJoin.initialize(groupId);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace('/(tabs)/bag');
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: IS_IOS,
          headerTransparent: true,
          headerTitle: l10n.t('group.join.title'),
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {!IS_IOS && (
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.back')}
          >
            <Ionicons name='chevron-back' size={24} color={Acg.ink} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <PretendardText style={styles.title} weight='semibold'>
              {l10n.t('group.join.title')}
            </PretendardText>
          </View>
          <View style={styles.headerSpacer} />
        </View>
      )}
      <View
        style={[
          styles.content,
          IS_IOS && {
            paddingTop: insets.top + NATIVE_HEADER_HEIGHT + AcgLayout.screenPadding,
          },
        ]}
      >
        {status === GroupJoinStatus.Loading ||
        status === GroupJoinStatus.AlreadyMember ? (
          <View style={styles.loading}>
            <LoadingView />
          </View>
        ) : (
          <View style={styles.body}>
            {group && (
              <View style={styles.summary}>
                <PretendardText style={styles.groupName} weight='semibold'>
                  {group.getName()}
                </PretendardText>
                {/* 숫자를 맨 앞에 두고 숫자 조각만 콘덴스드로 갈아 끼운다(HM-8). */}
                <PretendardText style={styles.meta}>
                  <AcgDisplayText style={styles.metaNumber}>
                    {dateText}
                  </AcgDisplayText>
                  {metaText}
                </PretendardText>
              </View>
            )}
            {messageKey && (
              <PretendardText style={styles.message}>
                {l10n.t(messageKey)}
              </PretendardText>
            )}
            {noticeKey && (
              <PretendardText style={styles.notice}>
                {l10n.t(noticeKey)}
              </PretendardText>
            )}
            {status === GroupJoinStatus.Ready && (
              <TouchableOpacity
                style={[styles.primaryButton, isJoining && styles.buttonDisabled]}
                onPress={() => void handleJoin()}
                disabled={isJoining}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.join.join')}
                accessibilityState={{ disabled: isJoining }}
              >
                <PretendardText style={styles.primaryText} weight='semibold'>
                  {isJoining
                    ? l10n.t('group.join.joining')
                    : l10n.t('group.join.join')}
                </PretendardText>
              </TouchableOpacity>
            )}
            {(status === GroupJoinStatus.Full ||
              status === GroupJoinStatus.InviteDisabled) && (
              <View
                style={[styles.primaryButton, styles.buttonDisabled]}
                accessible
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.join.join')}
                accessibilityState={{ disabled: true }}
              >
                <PretendardText style={styles.primaryText} weight='semibold'>
                  {l10n.t('group.join.join')}
                </PretendardText>
              </View>
            )}
            {status === GroupJoinStatus.NeedLogin && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => app.getLogInAlertManager()?.show()}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.list.login')}
              >
                <PretendardText style={styles.primaryText} weight='semibold'>
                  {l10n.t('group.list.login')}
                </PretendardText>
              </TouchableOpacity>
            )}
            {status === GroupJoinStatus.LoadFailed && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => void groupJoin.initialize(groupId)}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('common.retry')}
              >
                <PretendardText style={styles.primaryText} weight='semibold'>
                  {l10n.t('common.retry')}
                </PretendardText>
              </TouchableOpacity>
            )}
            {(status === GroupJoinStatus.NotFound ||
              status === GroupJoinStatus.InvalidLink ||
              status === GroupJoinStatus.Full ||
              status === GroupJoinStatus.InviteDisabled) && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleBack}
                activeOpacity={0.7}
                accessibilityRole='button'
                accessibilityLabel={l10n.t('group.join.back')}
              >
                <PretendardText style={styles.secondaryText} weight='semibold'>
                  {l10n.t('group.join.back')}
                </PretendardText>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      <LogInView logInAlertManager={app.getLogInAlertManager()!} />
      <AlertView alertManager={app.getAlertManager()!} />
      <ToastView toastManager={app.getToastManager()!} bottom={100} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Acg.paper,
  },
  header: {
    minHeight: 64,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  title: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  content: {
    flex: 1,
    paddingHorizontal: AcgLayout.screenPadding,
    paddingTop: AcgLayout.screenPadding,
    justifyContent: 'center',
  },
  loading: {
    alignItems: 'center',
  },
  body: {
    gap: 20,
  },
  summary: {
    gap: 6,
  },
  groupName: {
    ...AcgType.screenTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  metaNumber: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  message: {
    ...AcgType.body,
    color: Acg.ink,
  },
  notice: {
    ...AcgType.body,
    color: Acg.textMuted,
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  primaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
  secondaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  secondaryText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupJoinView);
