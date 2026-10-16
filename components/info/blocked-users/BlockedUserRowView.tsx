import { FC } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import dayjs from 'dayjs';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgPillButton,
  AcgRow,
  AcgType,
  Spacing,
} from '@/constants/DesignTokens';
import BlockedUser from '@/model/block/BlockedUser';
import app from '@/model/app/App';

interface Props {
  user: BlockedUser;
  isFirst: boolean;
  isUnblocking: boolean;
  onUnblock: (user: BlockedUser) => void;
}

// 차단한 사용자 한 행(CM-17): 닉네임 + 메타(차단 날짜), 우측 `해제` 알약 버튼. HM-8 목록 문법.
const BlockedUserRowView: FC<Props> = ({ user, isFirst, isUnblocking, onUnblock }) => {
  const l10n = app.getL10n();
  const name = user.name || l10n.t('moderation.block.unknownUser');
  const dateLabel = user.createdAt ? dayjs(user.createdAt).format('YYYY.MM.DD') : '';

  const handlePressUnblock = () => {
    onUnblock(user);
  };

  return (
    <View style={[styles.row, !isFirst && styles.rowDivider]}>
      <View style={styles.texts}>
        <PretendardText weight='medium' style={styles.name} numberOfLines={2}>
          {name}
        </PretendardText>
        {dateLabel ? (
          <PretendardText style={styles.meta}>{dateLabel}</PretendardText>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.unblockButton, isUnblocking && styles.unblockButtonDisabled]}
        onPress={handlePressUnblock}
        disabled={isUnblocking}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('moderation.blockedUsers.unblockAccessibility', { name })}
        accessibilityState={{ disabled: isUnblocking, busy: isUnblocking }}
      >
        <PretendardText weight='medium' style={styles.unblockText}>
          {l10n.t('moderation.blockedUsers.unblock')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: AcgRow.minHeight,
    paddingVertical: AcgRow.paddingVertical,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.item,
  },
  // 첫 행에는 헤어라인을 두지 않는다 — 제목 밑줄로 읽힌다(HM-8).
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 액션은 알약(높이의 절반) — 선택지 칩과 형태로 갈린다(HM-8). 라임은 화면당 주 액션 하나라 쓰지 않는다.
  unblockButton: {
    minHeight: AcgPillButton.minHeight,
    paddingHorizontal: AcgPillButton.paddingHorizontal,
    paddingVertical: AcgPillButton.paddingVertical,
    borderRadius: AcgPillButton.borderRadius,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockButtonDisabled: {
    opacity: 0.5,
  },
  unblockText: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(BlockedUserRowView);
