import { FC } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import PointListView, { PointRow } from '@/components/point/PointListView';
import RouteListView, {
  RouteRow,
  RouteRowAction,
} from '@/components/route/RouteListView';
import {
  createRouteDirectionAction,
  createRouteExportAction,
  getRouteMetaParts,
} from '@/components/route/RouteRowParts';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagPoint from '@/model/bag-point/BagPoint';
import { BagPointEntry } from '@/model/bag-point/BagPointEntry';
import { getBagPointMeta } from '@/model/bag-point/BagPointLabels';
import BagPointList from '@/model/bag-point/BagPointList';
import BagRoute from '@/model/bag-route/BagRoute';
import { BagRouteEntry } from '@/model/bag-route/BagRouteEntry';
import BagRouteList from '@/model/bag-route/BagRouteList';
import RouteListSegment from '@/model/route/RouteListSegment';
import RouteSegmentChipsView from '@/components/route/RouteSegmentChipsView';
import useRouteSheetPullDown from '@/components/route/useRouteSheetPullDown';

interface Props {
  bagRouteList: BagRouteList;
  bagPointList: BagPointList;
  // `코스 | 포인트` 세그먼트(BD-14). 화면이 들고 있다.
  segment: RouteListSegment;
  onChangeSegment: (segment: RouteListSegment) => void;
  onSelect: (entry: BagRouteEntry) => void;
  onDelete: (route: BagRoute) => void;
  onUploadToGroup: (route: BagRoute) => void;
  // 그린 코스 `⋯` → `코스 수정`(RD-7). 그릴 수 없는 환경(웹·옛 바이너리)에서는 넘기지 않는다.
  onEditRoute?: ((route: BagRoute) => void) | undefined;
  // 포인트 행 탭 → 지도가 그 포인트로 + 카드(BD-14). 웹(지도 없음)에서는 넘기지 않는다.
  onSelectPoint?: ((entry: BagPointEntry) => void) | undefined;
  onEditPoint: (point: BagPoint) => void;
  onDeletePoint: (point: BagPoint) => void;
  // 목록 아래 `코스 추가` → 메뉴(가져오기 | 지도에서 그리기, RD-1). 화면이 메뉴를 띄운다.
  onAddRoute: () => void;
  bottomInset: number;
  /**
   * 바텀 시트 안(BD-11, 네이티브 지도 화면)에 들어간다 — 목록이 시트 높이를 따라 남는 세로를 다 쓰고
   * (`maxHeight 220` 고정을 푼다), 세그먼트 칩 줄은 시트 머리(손잡이와 함께 끄는 영역)가 그리므로 여기서 뺀다.
   */
  fillHeight?: boolean;
}

/**
 * 배낭 코스 목록 + 추가 액션 (BD-11) · 포인트 목록 (BD-14).
 *
 * 위에 `코스 | 포인트` 세그먼트를 둔다(BD-14). 포인트 행은 유형 아이콘 + 제목 + `유형 · 10.09`이고
 * 내 포인트만 `⋯`(수정·삭제)가 선다 — 연결 그룹 포인트는 출처 조각을 달고 읽기 전용이다.
 * 포인트 추가는 지도의 `포인트 추가`·길게 누르기가 맡는다 — 목록 아래 라임 `코스 추가`는 이 화면의
 * 주 액션 하나라(HM-8) 포인트 세그먼트에서는 그리지 않는다.
 *
 * 행은 그룹 코스와 공용(`RouteListView`)이다. 연결된 그룹에서 온 코스는 메타 줄 끝에 출처를
 * 달고 **방향 뒤집기만** 준다 — 지우거나 고치는 일은 그룹 화면이 한다(뒤집기는 이 기기의 보기 설정이다).
 * 출처를 배지가 아니라 메타 조각으로 두는 이유는 HM-8이다(면 없이 헤어라인으로만 가르는
 * 목록에서 배지는 유일한 예외 면이 되고, 값 하나 때문에 행마다 작은 사각형이 생긴다).
 */
const BagRouteListSectionView: FC<Props> = ({
  bagRouteList,
  bagPointList,
  segment,
  onChangeSegment,
  onSelect,
  onDelete,
  onUploadToGroup,
  onEditRoute,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  onAddRoute,
  bottomInset,
  fillHeight = false,
}) => {
  const l10n = app.getL10n();
  // 바텀 시트 안이면 시트가 건넨다(BD-11) — 목록 맨 위에서 아래로 당기면 시트가 한 단 내려간다.
  const handleScrollEndDrag = useRouteSheetPullDown();
  const separator = l10n.t('common.metaSeparator');
  const entries = bagRouteList.getEntries();
  const isFull = bagRouteList.isFull();
  const canAdd = bagRouteList.canAdd();
  const submitting = bagRouteList.isSubmitting();

  const toRow = (entry: BagRouteEntry): RouteRow => {
    const meta = [
      ...getRouteMetaParts(entry.route),
      ...(entry.groupName
        ? [l10n.t('bag.route.fromGroup', { name: entry.groupName })]
        : []),
      // 내 코스를 연결 그룹에 올려 둔 경우 — 그 그룹 코스는 목록에서 접혔다(BD-11 중복 접기).
      ...(entry.sharedToGroup ? [l10n.t('bag.route.sharedToGroup')] : []),
    ].join(separator);
    // 뒤집기는 보기 설정이라 **모든 행**에 있다 — 연결 그룹에서 온 읽기 전용 코스와 웹에서도(GRP-8).
    const actions: RouteRowAction[] = [createRouteDirectionAction(entry.route)];
    const editableRoute =
      onEditRoute &&
      canAdd &&
      entry.owned &&
      entry.route instanceof BagRoute &&
      entry.route.isDrawn()
        ? entry.route
        : null;

    // 그린 코스 수정(RD-7) — 뒤집기 다음·삭제 위. 내 배낭의 그린 코스에만 둔다(권한 RD-8은 누를 때 본다).
    if (editableRoute && onEditRoute) {
      actions.push({
        icon: 'create-outline',
        label: l10n.t('routeDraw.editRoute'),
        onPress: () => onEditRoute(editableRoute),
      });
    }
    // GPX 내보내기도 모든 행이다 — 연결 그룹 코스는 그룹원이라, 내 배낭 코스는 소유자라 받는다(GRP-8).
    const exportAction = createRouteExportAction(entry.route);

    if (exportAction) {
      actions.push(exportAction);
    }

    // 웹은 보기 전용이다(APP-5, BD-11) — 파일 선택기가 없어 추가가 불가능한 화면에서
    // 삭제만 여는 것은 균형이 맞지 않는다. `canAdd()`가 그 경계를 그대로 쓴다.
    if (canAdd && entry.owned && entry.route instanceof BagRoute) {
      const route = entry.route;

      if (bagRouteList.canUploadToGroup()) {
        actions.push({
          icon: 'people-outline',
          label: l10n.t('bag.route.toGroup'),
          onPress: () => onUploadToGroup(route),
        });
      }

      // 파괴적 액션은 메뉴 맨 아래다(BD-1 `⋯` 메뉴와 같은 순서).
      actions.push({
        icon: 'trash-outline',
        label: l10n.t('route.delete'),
        onPress: () => onDelete(route),
      });
    }

    return {
      id: entry.key,
      title: entry.route.getName(),
      meta,
      onSelect: () => onSelect(entry),
      actions,
    };
  };

  const toPointRow = (entry: BagPointEntry): PointRow => {
    const point = entry.point;
    // 수정·삭제는 내 포인트에만, 그리고 좌표를 다룰 수 있는 네이티브에서만 연다(웹은 읽기 전용, BD-14).
    const actions =
      bagPointList.canEdit() && entry.owned && point instanceof BagPoint
        ? [
            {
              icon: 'create-outline' as const,
              label: l10n.t('group.point.edit'),
              onPress: () => onEditPoint(point),
            },
            // 파괴적 액션은 메뉴 맨 아래다(코스 행과 같은 순서).
            {
              icon: 'trash-outline' as const,
              label: l10n.t('group.point.delete'),
              onPress: () => onDeletePoint(point),
            },
          ]
        : undefined;

    return {
      id: entry.key,
      point,
      meta: getBagPointMeta(entry),
      onSelect: onSelectPoint ? () => onSelectPoint(entry) : undefined,
      actions,
    };
  };

  // 시트 안에서는 칩 줄을 시트 머리가 그린다(fillHeight).
  const renderSegment = () =>
    fillHeight ? null : (
      <View style={styles.segment}>
        <RouteSegmentChipsView
          segment={segment}
          onChangeSegment={onChangeSegment}
        />
      </View>
    );

  const listStyle = fillHeight ? styles.listFill : styles.list;
  const sectionStyle = [
    styles.section,
    fillHeight && styles.sectionFill,
    { paddingBottom: bottomInset },
  ];

  // 빈 목록 문구 — 유형 칩에 걸려 비었는지, 정말 없는지(웹은 찍는 법 안내 없이) 가른다.
  const getPointEmptyKey = () => {
    if (bagPointList.hasAny()) {
      return 'bag.point.emptyFiltered';
    }

    return bagPointList.canEdit()
      ? 'bag.point.empty'
      : 'bag.point.emptyReadOnly';
  };

  // 포인트 목록 본문 — 첫 조회 전에는 빈 문구를 그리지 않고(아직 없는지 모른다), 실패하면
  // 빈 문구 대신 실패를 알리고 다시 시도를 준다(코스 실패 화면과 같은 문구, BD-14).
  const renderPointList = () => {
    if (!bagPointList.isInitialized()) {
      return null;
    }

    const pointEntries = bagPointList.getVisibleEntries();

    if (bagPointList.getError() && pointEntries.length === 0) {
      return (
        <View style={styles.failed}>
          <PretendardText style={styles.empty}>
            {l10n.t('bag.point.loadFailed')}
          </PretendardText>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => void bagPointList.refresh()}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('common.retry')}
          >
            <PretendardText weight='semibold' style={styles.retryLabel}>
              {l10n.t('common.retry')}
            </PretendardText>
          </TouchableOpacity>
        </View>
      );
    }

    if (pointEntries.length === 0) {
      return (
        <PretendardText style={styles.empty}>
          {l10n.t(getPointEmptyKey())}
        </PretendardText>
      );
    }

    return (
      <ScrollView
        style={listStyle}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={styles.listContent}
      >
        <PointListView
          rows={pointEntries.map(toPointRow)}
          disabled={bagPointList.isSubmitting()}
        />
      </ScrollView>
    );
  };

  if (segment === RouteListSegment.Points) {
    const isPointFull = bagPointList.isFull();

    return (
      <View style={sectionStyle}>
        {renderSegment()}
        {renderPointList()}
        {/* 상한에 닿으면 지도의 `포인트 추가`를 막고, 목록에도 **그 자리에** 이유를 적는다(BD-14). */}
        {isPointFull && bagPointList.canEdit() ? (
          <PretendardText style={styles.limit}>
            {bagPointList.getLimitMessage()}
          </PretendardText>
        ) : null}
      </View>
    );
  }

  return (
    <View style={sectionStyle}>
      {renderSegment()}
      {entries.length === 0 ? (
        <PretendardText style={styles.empty}>
          {l10n.t('bag.route.empty')}
        </PretendardText>
      ) : (
        <ScrollView
          style={listStyle}
          showsVerticalScrollIndicator={false}
          onScrollEndDrag={handleScrollEndDrag}
          contentContainerStyle={styles.listContent}
        >
          <RouteListView
            rows={entries.map(toRow)}
            selectedId={bagRouteList.getSelectedKey()}
            disabled={submitting}
          />
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
            onPress={onAddRoute}
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
  segment: {
    paddingTop: 12,
  },
  section: {
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    gap: 8,
  },
  // 시트 안에서는 시트 높이가 곧 목록 높이다 — 섹션이 남는 세로를 다 쓰고 목록이 그 안을 채운다.
  sectionFill: {
    flex: 1,
  },
  // 지도가 남는 세로를 다 쓰도록 목록은 제 높이를 넘기지 않는다.
  list: {
    maxHeight: 220,
  },
  listFill: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 4,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 16,
  },
  failed: {
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 8,
  },
  // 코스 실패 화면의 다시 시도와 같은 면(연회색 알약, 44pt 터치 — HIG).
  retry: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: Radius.pill,
    backgroundColor: Acg.controlFill,
  },
  retryLabel: {
    ...AcgType.control,
    color: Acg.ink,
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
