import { FC } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';

interface Props {
  title: string;
  // 섹션 머리 오른쪽 텍스트 액션. 없으면 제목만 그린다.
  actionLabel?: string | undefined;
  onPressAction?: (() => void) | undefined;
  /**
   * 누르면 다른 화면으로 넘어가는 액션이면 `true` — 라벨 뒤에 셰브론이 선다(`지도 ›`, `전체 N개 ›`).
   * 이 자리에서 일이 끝나는 액션(`코스 추가`)은 셰브론도 `+` 아이콘도 없이 텍스트만이다.
   */
  navigates?: boolean | undefined;
  actionDisabled?: boolean | undefined;
  // 진행 중이면 라벨 앞에 스피너를 둔다(코스 업로드).
  actionBusy?: boolean | undefined;
}

/**
 * 그룹 상세 섹션 머리 (GRP-11) — 제목 + 오른쪽 텍스트 액션 하나.
 *
 * 섹션마다 액션 모양이 갈리던 것(텍스트만 / 텍스트 + 셰브론)을 한 문법으로 모은다:
 * **액션은 전부 잉크 텍스트(`control` 14)이고, 다른 화면으로 넘어가는 것만 셰브론을 단다.**
 * 누를 수 있음을 색이 아니라 셰브론·위치로 알린다(HM-8). 히트 영역은 44pt다(HIG).
 */
const GroupSectionHeaderView: FC<Props> = ({
  title,
  actionLabel,
  onPressAction,
  navigates = false,
  actionDisabled = false,
  actionBusy = false,
}) => {
  const hasAction = !!actionLabel && !!onPressAction;

  return (
    <View style={styles.header}>
      <View style={styles.title}>
        <AcgSectionHeaderView title={title} />
      </View>
      {hasAction ? (
        <TouchableOpacity
          style={styles.action}
          onPress={onPressAction}
          disabled={actionDisabled}
          accessibilityRole='button'
          accessibilityState={{ disabled: actionDisabled }}
          accessibilityLabel={actionLabel}
        >
          {actionBusy ? (
            <ActivityIndicator size='small' color={Acg.textMuted} />
          ) : null}
          <PretendardText
            style={[styles.label, actionDisabled && styles.labelDisabled]}
          >
            {actionLabel}
          </PretendardText>
          {navigates ? (
            <Ionicons
              name='chevron-forward'
              size={14}
              color={actionDisabled ? Acg.textMuted : Acg.ink}
            />
          ) : null}
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
  },
  // 제목 줄(24)에 맞춰 44pt 히트 영역을 위로 끌어올린다 — 액션 라벨이 제목과 같은 줄에 선다.
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    marginTop: -10,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
  labelDisabled: {
    color: Acg.textMuted,
  },
});

export default GroupSectionHeaderView;
