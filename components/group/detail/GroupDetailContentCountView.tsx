import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  routeCount: number;
  pointCount: number;
  // 지도 밴드 바로 아래에 붙을 때 밴드의 아래 간격을 조금 되돌려 밴드의 캡션처럼 읽히게 한다.
  attachedToBand: boolean;
  onPress: () => void;
}

// 밴드 아래 간격(12) 중 되돌리는 양. 44pt 히트 영역은 그대로이고 글자만 밴드에 다가간다.
const BAND_ATTACH_OFFSET = 8;

/**
 * 지도 밴드 아래 개수 줄 (GRP-7) — `코스 {N} · 포인트 {N} ›`. 누르면 그룹 지도로 간다.
 *
 * 섹션을 없앤 대신 무엇이 얼마나 있는지를 한눈에 보여주고, 밴드를 누를 수 있다는 단서가 된다.
 * 메타 줄이라 14 잉크다(회색이 아니다, HM-8). 다른 화면으로 가는 줄이라 셰브론을 단다.
 * 웹은 밴드가 없어 이 줄이 그룹 지도(목록)로 가는 **유일한 입구**다 — 그래서 웹에서는 개수가
 * 0이어도 그린다(판정은 헤더가 한다).
 */
const GroupDetailContentCountView: FC<Props> = ({
  routeCount,
  pointCount,
  attachedToBand,
  onPress,
}) => {
  const l10n = app.getL10n();
  const text = [
    l10n.t('group.detail.routeCount', { count: routeCount }),
    l10n.t('group.detail.pointCount', { count: pointCount }),
  ].join(l10n.t('group.detail.metaSeparator'));

  return (
    <TouchableOpacity
      style={[styles.row, attachedToBand && styles.attached]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={text}
      accessibilityHint={l10n.t('group.detail.openMapBand')}
    >
      <PretendardText style={styles.text} numberOfLines={1}>
        {text}
      </PretendardText>
      <Ionicons name='chevron-forward' size={16} color={Acg.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  attached: {
    marginTop: -BAND_ATTACH_OFFSET,
  },
  text: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(GroupDetailContentCountView);
