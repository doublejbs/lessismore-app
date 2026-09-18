import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import RouteListView, {
  RouteRow,
  RouteRowAction,
} from '@/components/route/RouteListView';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import BagRouteList from '@/model/bag-route/BagRouteList';

interface Props {
  bagRouteList: BagRouteList;
  onSelect: (entry: BagRouteEntry) => void;
  onDelete: (route: BagRoute) => void;
  onUploadToGroup: (route: BagRoute) => void;
  bottomInset: number;
}

/**
 * 배낭 코스 목록 + 추가 액션 (BD-11).
 *
 * 행은 그룹 코스와 공용(`RouteListView`)이다. 연결된 그룹에서 온 코스는 메타 줄 끝에 출처를
 * 달고 **액션을 주지 않는다** — 지우거나 고치는 일은 그룹 화면이 한다.
 * 출처를 배지가 아니라 메타 조각으로 두는 이유는 HM-8이다(면 없이 헤어라인으로만 가르는
 * 목록에서 배지는 유일한 예외 면이 되고, 값 하나 때문에 행마다 작은 사각형이 생긴다).
 */
const BagRouteListSectionView: FC<Props> = ({
  bagRouteList,
  onSelect,
  onDelete,
  onUploadToGroup,
  bottomInset,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('common.metaSeparator');
  const entries = bagRouteList.getEntries();
  const isFull = bagRouteList.isFull();
  const canAdd = bagRouteList.canAdd();
  const submitting = bagRouteList.isSubmitting();

  const toRow = (entry: BagRouteEntry): RouteRow => {
    const elevationGain = entry.route.getElevationGain();
    const meta = [
      entry.route.getDistanceText(),
      ...(elevationGain === undefined
        ? []
        : [
            l10n.t('common.route.elevation', {
              value: Math.round(elevationGain),
            }),
          ]),
      ...(entry.groupName
        ? [l10n.t('bag.route.fromGroup', { name: entry.groupName })]
        : []),
    ].join(separator);
    const actions: RouteRowAction[] = [];

    // 웹은 보기 전용이다(APP-5, BD-11) — 파일 선택기가 없어 추가가 불가능한 화면에서
    // 삭제만 여는 것은 균형이 맞지 않는다. `canAdd()`가 그 경계를 그대로 쓴다.
    if (canAdd && entry.owned && entry.route instanceof BagRoute) {
      const route = entry.route;

      if (bagRouteList.canUploadToGroup()) {
        actions.push({
          label: l10n.t('bag.route.toGroup'),
          onPress: () => onUploadToGroup(route),
        });
      }

      actions.push({
        label: l10n.t('bag.route.delete'),
        onPress: () => onDelete(route),
      });
    }

    return {
      id: entry.key,
      title: entry.route.getName(),
      meta,
      onSelect: () => onSelect(entry),
      ...(actions.length > 0 ? { actions } : {}),
    };
  };

  return (
    <View style={[styles.section, { paddingBottom: bottomInset }]}>
      {entries.length === 0 ? (
        <PretendardText style={styles.empty}>
          {l10n.t('bag.route.empty')}
        </PretendardText>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          <RouteListView rows={entries.map(toRow)} disabled={submitting} />
        </ScrollView>
      )}

      {/* 웹에는 파일 선택기가 없어 추가 액션 자체를 그리지 않는다(APP-5, BD-11). */}
      {canAdd ? (
        <View style={styles.footer}>
          {/* 상한에 닿으면 버튼을 막고 **그 자리에** 이유를 적는다 — 눌리지 않는 버튼만
            두면 왜 안 되는지 알 수 없다(HIG). */}
          {isFull ? (
            <PretendardText style={styles.limit}>
              {bagRouteList.getLimitMessage()}
            </PretendardText>
          ) : null}
          {/* 이 화면의 주 액션 하나 — 라임은 여기에만 쓴다(HM-8). */}
          <TouchableOpacity
            style={[
              styles.addButton,
              (isFull || submitting) && styles.disabled,
            ]}
            onPress={() => void bagRouteList.addRoute()}
            disabled={isFull || submitting}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('bag.route.add')}
            accessibilityState={{ disabled: isFull || submitting }}
          >
            <Ionicons name='add' size={20} color={Acg.ink} />
            <PretendardText weight='semibold' style={styles.addLabel}>
              {l10n.t(submitting ? 'bag.route.uploading' : 'bag.route.add')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    gap: 8,
  },
  // 지도가 남는 세로를 다 쓰도록 목록은 제 높이를 넘기지 않는다.
  list: {
    maxHeight: 220,
  },
  listContent: {
    paddingBottom: 4,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 16,
  },
  footer: {
    gap: 8,
    paddingTop: 4,
  },
  limit: {
    ...AcgType.meta,
    color: Acg.textMuted,
    textAlign: 'center',
  },
  addButton: {
    alignSelf: 'center',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: Radius.pill,
    backgroundColor: Acg.lime,
  },
  disabled: {
    opacity: 0.5,
  },
  addLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(BagRouteListSectionView);
