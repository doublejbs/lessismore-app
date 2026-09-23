import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

const MIN_TOUCH_HEIGHT = 44;

/**
 * 헤더 그룹 한 줄 (BD-1): `{그룹 이름} · 멤버 {N}명 ›`.
 * 이 배낭이 어느 여행의 것인지는 배낭의 정체성이라 액션 그리드가 아니라 헤더(기간 줄 아래)에 둔다.
 * 메타 문법(14, 잉크) — 면·배지를 두지 않고 누를 수 있음은 셰브론으로 알린다(HM-8).
 * 연결이 없으면 그리지 않는다.
 */
const BagDetailGroupView: FC<Props> = ({ bagDetail }) => {
  const group = bagDetail.getLinkedGroup();

  if (!group) {
    return null;
  }

  const l10n = app.getL10n();
  const members = l10n.t('bag.group.members', {
    count: group.getMemberCount(),
  });

  const handlePress = () => {
    bagDetail.goToLinkedGroup();
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={l10n.t('bag.group.rowLabel', {
        name: group.getName(),
        members,
      })}
    >
      <Ionicons name='people-outline' size={16} color={Acg.ink} />
      <PretendardText style={styles.text} numberOfLines={1}>
        {`${group.getName()}${l10n.t('common.metaSeparator')}${members}`}
      </PretendardText>
      <Ionicons name='chevron-forward' size={14} color={Acg.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    // 이름·기간 행과 같은 이유로 폭을 부모로 제한한다(BagDetailNameView 주석 참고).
    maxWidth: '100%',
    minHeight: MIN_TOUCH_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  text: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(BagDetailGroupView);
