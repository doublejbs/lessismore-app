import { FC, useEffect } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { Ionicons } from '@expo/vector-icons';
import BagDetail from '@/model/bag-detail/BagDetail';
import PretendardText from '@/components/PretendardText';
import {
  Acg,
  AcgLayout,
  AcgRadius,
  AcgType,
  Radius,
} from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  bagDetail: BagDetail;
}

// 그룹 카드(`BagDetailGroupView`)와 같은 값 — 연결 전후로 같은 자리·같은 문법이어야 한다.
const ICON_CIRCLE_SIZE = 36;
const MIN_TOUCH_HEIGHT = 44;

/**
 * 일행 초대 카드 (BD-1 · GRP-13). 그룹 카드 자리(요약 아래·액션 그리드 위)에 두는 **빈 그룹 카드**다.
 * 면 문법은 그룹 카드와 같고(연회색 채움 + 모서리 12, 그림자 없음), 카드 전체가 하나의 버튼이다 —
 * 오른쪽 `초대하기` 알약은 표시일 뿐 따로 누르는 자리가 아니다. 라임은 쓰지 않는다(주 액션은 하단 바).
 * 연결이 없는 예정 배낭에서만 그린다 — 조건은 `BagDetail.canShowGroupInvite()`.
 */
const BagDetailGroupInviteView: FC<Props> = ({ bagDetail }) => {
  const visible = bagDetail.canShowGroupInvite();

  useEffect(() => {
    if (!visible) {
      return;
    }

    bagDetail.logGroupInviteShown();
  }, [bagDetail, visible]);

  if (!visible) {
    return null;
  }

  const l10n = app.getL10n();
  const title = l10n.t('bag.group.inviteTitle');
  const action = l10n.t('bag.group.inviteAction');

  const handlePress = () => {
    bagDetail.goToGroupInvite();
  };

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.card}
        onPress={handlePress}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={`${title} ${action}`}
      >
        <View style={styles.iconCircle}>
          <Ionicons name='person-add' size={20} color={Acg.paper} />
        </View>
        <View style={styles.texts}>
          <PretendardText style={styles.title} weight='medium' numberOfLines={1}>
            {title}
          </PretendardText>
          <PretendardText style={styles.meta} numberOfLines={1}>
            {l10n.t('bag.group.inviteMeta')}
          </PretendardText>
        </View>
        <View style={styles.pill}>
          <PretendardText
            style={styles.pillLabel}
            weight='semibold'
            numberOfLines={1}
          >
            {action}
          </PretendardText>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// wrap·card·iconCircle·texts·title·meta는 그룹 카드의 값을 그대로 옮겼다(`BagDetailGroupView` 참고).
const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AcgLayout.screenPadding,
    marginTop: 12,
  },
  card: {
    minHeight: MIN_TOUCH_HEIGHT,
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: Acg.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
  },
  // 표시용 잉크 알약 — 누르는 자리는 카드 전체다.
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: Acg.ink,
    // 좁은 폭에서는 제목이 줄어들고 알약은 그대로 둔다.
    flexShrink: 0,
  },
  pillLabel: {
    ...AcgType.meta,
    color: Acg.paper,
  },
});

export default observer(BagDetailGroupInviteView);
