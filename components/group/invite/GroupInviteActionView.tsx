import { FC, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import app from '@/model/app/App';
import Group from '@/model/group/Group';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Radius } from '@/constants/DesignTokens';
import GroupInviteActionTone from './GroupInviteActionTone';

interface Props {
  group: Group;
  // 기본값은 그룹의 초대 잠금 상태다(GRP-3). 화면이 더 좁은 조건을 걸고 싶을 때만 넘긴다.
  disabled?: boolean;
  // 버튼이 놓이는 바탕. 기본은 흰 지면 위다(하단 초대 섹션).
  tone?: GroupInviteActionTone;
}

/**
 * 초대 링크 복사 액션 (GRP-3).
 *
 * 링크는 `Group.getInviteUrl()`(= `{WEB_BASE_URL}/group/{groupId}`) 하나만 쓴다 — 화면마다
 * 링크를 다시 조립하면 웹 랜딩과의 경로 계약이 갈라진다.
 * 라임(주 액션)을 쓰지 않는다 — 이 컨트롤이 놓이는 화면의 주 액션은 따로 있다(HM-8).
 */
const GroupInviteActionView: FC<Props> = ({
  group,
  disabled,
  tone = GroupInviteActionTone.OnPaper,
}) => {
  const [isCopying, setIsCopying] = useState(false);
  const l10n = app.getL10n();
  const isDisabled = disabled ?? !group.getInviteEnabled();
  const label = isDisabled
    ? l10n.t('group.invite.disabled')
    : l10n.t('group.invite.copy');

  const handleCopy = async () => {
    if (isDisabled || isCopying) {
      return;
    }

    setIsCopying(true);

    try {
      await Clipboard.setStringAsync(group.getInviteUrl());
      app.getAnalyticsManager()?.logClick('group_invite_copy');
      app.getToastManager()?.show({
        message: l10n.t('group.invite.copied'),
      });
    } catch (error) {
      console.error('초대 링크 복사 실패:', error); // l10n-ignore: 개발자 로그
      app.getToastManager()?.show({
        message: l10n.t('group.invite.copyFailed'),
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.action,
        tone === GroupInviteActionTone.OnSurface && styles.actionOnSurface,
        isDisabled && styles.actionDisabled,
      ]}
      onPress={() => void handleCopy()}
      activeOpacity={0.7}
      disabled={isDisabled || isCopying}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled || isCopying }}
    >
      <View style={styles.body}>
        <Ionicons
          name={isDisabled ? 'lock-closed-outline' : 'link-outline'}
          size={18}
          color={isDisabled ? Acg.textMuted : Acg.ink}
        />
        <PretendardText
          style={[styles.label, isDisabled && styles.labelDisabled]}
          weight='semibold'
        >
          {label}
        </PretendardText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  action: {
    // 글자를 담는 컨트롤이라 고정 높이 대신 최소 높이 + 세로 패딩으로 Dynamic Type을 받는다.
    minHeight: 48,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionOnSurface: {
    backgroundColor: Acg.paper,
  },
  actionDisabled: {
    opacity: 0.6,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
  labelDisabled: {
    color: Acg.textMuted,
  },
});

export default observer(GroupInviteActionView);
