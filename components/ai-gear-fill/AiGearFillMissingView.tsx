import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GearFilter from '@/model/gear/GearFilter';
import { getGearFilterName } from '@/model/gear/GearFilterName';

interface Props {
  groups: GearFilter[];
  onPress: () => void;
}

const MIN_TOUCH = 44;

/**
 * 창고에 없는 필수 줄(AS-14) — `창고에 없어요: 침낭 · 매트` + 우측 셰브론. 면 없이 지면 위 한 줄이고
 * 행 전체가 버튼이다 → 이 배낭 컨텍스트의 검색(GE-8)으로 채운다. 그룹 이름은 DM-4 1차 그룹 라벨.
 * 섹션 사이 간격(Result의 gap)으로만 갈라 헤어라인을 두지 않는다 — 위 섹션의 마지막 행 밑줄로 읽히지 않게.
 */
const AiGearFillMissingView: FC<Props> = ({ groups, onPress }) => {
  if (groups.length === 0) {
    return null;
  }

  const l10n = app.getL10n();
  const label = l10n.t('aiGearFill.missing', {
    groups: groups
      .map(group => getGearFilterName(group))
      .join(l10n.t('common.metaSeparator')),
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityHint={l10n.t('aiGearFill.searchAdd')}
    >
      <PretendardText style={styles.text}>{label}</PretendardText>
      <Ionicons name='chevron-forward' size={16} color={Acg.textMuted} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: MIN_TOUCH,
  },
  text: {
    ...AcgType.body,
    color: Acg.ink,
    flex: 1,
  },
});

export default AiGearFillMissingView;
