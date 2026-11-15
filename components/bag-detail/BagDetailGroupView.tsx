import { FC } from 'react';
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

const ICON_CIRCLE_SIZE = 36;
const MIN_TOUCH_HEIGHT = 44;

/**
 * 그룹 카드 (BD-1, 2026-10-13 개정). 요약 바로 아래·액션 그리드 위의 폭 전체 카드.
 * 그리드 타일과 같은 면 문법(연회색 채움 + 모서리 12, 그림자 없음)이고, 누를 수 있음은 셰브론으로 알린다.
 * 카드 본문(그룹 상세)과 보조 알약(그룹 지도·일행 배낭)은 터치 영역을 형제로 가른다 —
 * 중첩하면 VoiceOver가 안쪽 버튼을 따로 짚지 못한다.
 * 라임은 쓰지 않는다(이 화면의 주 액션은 하단 바). 연결이 없으면 그리지 않는다.
 */
const BagDetailGroupView: FC<Props> = ({ bagDetail }) => {
  const group = bagDetail.getLinkedGroup();

  if (!group) {
    return null;
  }

  const l10n = app.getL10n();
  const routeCount = group.getRouteCount();
  const pointCount = group.getPointCount();
  // 0인 조각은 뺀다 — 멤버는 최소 1명(본인)이라 항상 남는다.
  const metaParts = [
    l10n.t('bag.group.members', { count: group.getMemberCount() }),
    ...(routeCount > 0
      ? [l10n.t('bag.group.routes', { count: routeCount })]
      : []),
    ...(pointCount > 0
      ? [l10n.t('bag.group.points', { count: pointCount })]
      : []),
  ];
  const meta = metaParts.join(l10n.t('common.metaSeparator'));
  const openMapLabel = l10n.t('bag.group.openMap');
  const openBagsLabel = l10n.t('bag.group.openBags');

  const handlePressCard = () => {
    bagDetail.goToLinkedGroup();
  };

  const handlePressMap = () => {
    bagDetail.goToLinkedGroupMap();
  };

  // 그룹 상세에 일행 배낭 섹션 앵커가 없어 그룹 상세로 연다(BD-1 — 앵커가 없으면 그룹 상세).
  const handlePressBags = () => {
    bagDetail.goToLinkedGroup();
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.main}
          onPress={handlePressCard}
          activeOpacity={0.7}
          accessibilityRole='button'
          accessibilityLabel={l10n.t('bag.group.cardLabel', {
            name: group.getName(),
            meta,
          })}
        >
          <View style={styles.iconCircle}>
            <Ionicons name='people' size={20} color={Acg.paper} />
          </View>
          <View style={styles.texts}>
            <PretendardText
              style={styles.title}
              weight='medium'
              numberOfLines={1}
            >
              {group.getName()}
            </PretendardText>
            <PretendardText style={styles.meta} numberOfLines={1}>
              {meta}
            </PretendardText>
          </View>
          <Ionicons name='chevron-forward' size={16} color={Acg.ink} />
        </TouchableOpacity>
        <View style={styles.pills}>
          <TouchableOpacity
            style={styles.pill}
            onPress={handlePressMap}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={openMapLabel}
          >
            <Ionicons name='map-outline' size={16} color={Acg.ink} />
            <PretendardText
              style={styles.pillLabel}
              weight='semibold'
              numberOfLines={1}
            >
              {openMapLabel}
            </PretendardText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.pill}
            onPress={handlePressBags}
            activeOpacity={0.7}
            accessibilityRole='button'
            accessibilityLabel={openBagsLabel}
          >
            <Ionicons name='bag-handle-outline' size={16} color={Acg.ink} />
            <PretendardText
              style={styles.pillLabel}
              weight='semibold'
              numberOfLines={1}
            >
              {openBagsLabel}
            </PretendardText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: AcgLayout.screenPadding,
    marginTop: 12,
  },
  card: {
    backgroundColor: Acg.controlFill,
    borderRadius: AcgRadius.thumb,
    padding: 16,
    gap: 12,
  },
  main: {
    minHeight: MIN_TOUCH_HEIGHT,
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
  pills: {
    flexDirection: 'row',
    gap: 8,
  },
  // 액션은 알약(HM-8 — 형태로 "선택지 vs 액션"이 갈린다). Dynamic Type 대응으로 고정 높이 대신 minHeight.
  pill: {
    flex: 1,
    minHeight: MIN_TOUCH_HEIGHT,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Acg.paper,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pillLabel: {
    ...AcgType.control,
    color: Acg.ink,
    flexShrink: 1,
  },
});

export default observer(BagDetailGroupView);
