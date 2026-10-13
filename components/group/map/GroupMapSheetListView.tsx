import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PointListView, { PointRow } from '@/components/point/PointListView';
import PretendardText from '@/components/PretendardText';
import useRouteSheetPullDown from '@/components/route/useRouteSheetPullDown';
import { Acg, AcgLayout, AcgType, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupRoute from '@/model/group/GroupRoute';
import GroupValidationError from '@/model/group/GroupValidationError';
import { getGroupValidationMessage } from '@/model/group-error/GroupErrorMessage';
import GroupMap from '@/model/group-map/GroupMap';
import { getGroupPointAuthorLabel } from '@/model/group-point/GroupPointLabels';
import { getPointDateText, getPointTypeLabel } from '@/model/point/PointLabels';
import RouteListSegment from '@/model/route/RouteListSegment';

interface Props {
  groupMap: GroupMap;
  // `코스 | 포인트` 세그먼트 — 시트 머리의 칩 줄이 바꾸고 지도 본문이 들고 있다.
  segment: RouteListSegment;
  // 코스 행 탭 → 그 코스를 고르고 카메라를 옮긴다(GRP-10).
  onSelectRoute: (route: GroupRoute) => void;
  // 코스 행 `⋯` → 삭제(올린 사람·방장만). 확인 알럿은 화면이 띄운다.
  onDeleteRoute: (route: GroupRoute) => void;
  // `코스 추가` — GPX 선택 → 업로드(GRP-8).
  onAddRoute: () => void;
  // `코스 추가`로 시작한 작업이 진행 중인지(파일 선택 포함) / 그중 업로드 단계인지.
  isAddingRoute: boolean;
  isUploadingRoute: boolean;
  // 포인트 행 탭 → 지도가 그 포인트로 + 카드(GRP-10).
  onSelectPoint: (point: GroupPoint) => void;
  onEditPoint: (point: GroupPoint) => void;
  onDeletePoint: (point: GroupPoint) => void;
  // 목록 섹션 아래 여백(세이프에어리어 + 12) — 시트 단 높이 계산이 같은 값을 쓴다.
  bottomInset: number;
}

/**
 * 그룹 지도 바텀 시트의 목록 (GRP-10) — 배낭 코스 화면 시트 목록(`BagRouteListSectionView` `fillHeight`)과
 * 같은 문법이다. 섹션이 시트의 남는 세로를 다 쓰고, 목록은 그 안에서 스크롤된다. 펼침에서 목록 맨 위를 아래로
 * 당기면 시트가 한 단 내려간다(`useRouteSheetPullDown`, iOS).
 *
 * - 코스: 공용 코스 행(선택 막대, `⋯` 뒤집기·내보내기·삭제) + 목록 아래 흰 보조 알약 `코스 추가`. 라임은 지도의
 *   `포인트 추가` 하나다(HM-8). 상한(5)이면 버튼을 막고 **그 자리에** 이유를 적는다.
 * - 포인트: 배낭 코스 화면과 같은 공용 포인트 행(`PointListView` — 유형 아이콘 + 제목 + `유형 · 작성자 · 등록일`).
 *   수정·삭제는 작성자·방장에게만 행 `⋯` 메뉴로 연다(GRP-11 — 행 오른쪽 끝의 누를 곳은 하나). 상단 유형 칩
 *   필터를 그대로 따른다. 상한(50)이면 아래에 이유.
 */
const GroupMapSheetListView: FC<Props> = ({
  groupMap,
  segment,
  onSelectRoute,
  onDeleteRoute,
  onAddRoute,
  isAddingRoute,
  isUploadingRoute,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  bottomInset,
}) => {
  const l10n = app.getL10n();
  // 펼침에서 목록 맨 위를 당기면 시트가 한 단 내려간다(BD-11 · GRP-10).
  const handleScrollEndDrag = useRouteSheetPullDown();
  const routeList = groupMap.getRouteList();
  const pointList = groupMap.getPointList();
  const group = groupMap.getGroup();
  const routes = groupMap.getRoutes();
  const sectionStyle = [styles.section, { paddingBottom: bottomInset }];
  const separator = l10n.t('group.detail.metaSeparator');

  // 포인트 행 — 메타 `유형 · 작성자 · 등록일`(GRP-9), 수정·삭제는 작성자·방장에게만 `⋯`로(GRP-4 · GRP-11).
  const toPointRow = (point: GroupPoint): PointRow => {
    const meta = [
      getPointTypeLabel(point.getType()),
      getGroupPointAuthorLabel(
        point.getAuthorId(),
        point.getAuthorName(),
        groupMap.getMemberIds()
      ),
      getPointDateText(point.getCreatedAt()),
    ].join(separator);
    // 권한 판단은 한곳(`GroupMap.canEditPoint`)에 모은다 — 카드의 수정·삭제 노출과 같은 기준이다.
    const actions = groupMap.canEditPoint(point)
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
      id: point.getId(),
      point,
      meta,
      onSelect: () => onSelectPoint(point),
      actions,
    };
  };

  // 조회 실패 + 빈 목록 — 빈 문구 대신 실패를 알리고 다시 시도를 준다(배낭 코스 화면과 같은 문법).
  // 실패를 "비어 있음"으로 읽히게 두면 사용자가 코스·포인트가 없다고 오해한다.
  const renderFailed = (messageKey: string, onRetry: () => void) => (
    <View style={styles.failed}>
      <PretendardText style={styles.empty}>{l10n.t(messageKey)}</PretendardText>
      <TouchableOpacity
        style={styles.retry}
        onPress={onRetry}
        accessibilityRole='button'
        accessibilityLabel={l10n.t('common.retry')}
      >
        <PretendardText weight='semibold' style={styles.retryLabel}>
          {l10n.t('common.retry')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );

  // 포인트 목록 본문 — 첫 조회 전에는 빈 문구를 그리지 않는다(아직 없는지 모른다). 비었으면 유형 칩에 걸려
  // 비었는지, 정말 없는지 가른다.
  const renderPointList = () => {
    if (!pointList.isInitialized()) {
      return null;
    }

    const points = pointList.getVisiblePoints();

    if (pointList.getError() && pointList.getCount() === 0) {
      return renderFailed(
        'bag.point.loadFailed',
        () => void pointList.refresh()
      );
    }

    if (points.length === 0) {
      return (
        <PretendardText style={styles.empty}>
          {l10n.t(
            pointList.getCount() > 0
              ? 'bag.point.emptyFiltered'
              : 'group.detail.pointsEmpty'
          )}
        </PretendardText>
      );
    }

    return (
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={styles.listContent}
      >
        <PointListView
          rows={points.map(toPointRow)}
          disabled={pointList.isSubmitting()}
        />
      </ScrollView>
    );
  };

  // 코스 목록 본문 — 첫 조회 전에는 빈 문구를 그리지 않는다.
  const renderRouteList = () => {
    if (!routeList.isInitialized()) {
      return null;
    }

    if (routeList.getError() && routes.length === 0) {
      return renderFailed(
        'bag.route.loadFailed',
        () => void routeList.refresh()
      );
    }

    if (routes.length === 0) {
      return (
        <PretendardText style={styles.empty}>
          {l10n.t('group.detail.routesEmpty')}
        </PretendardText>
      );
    }

    return (
      <ScrollView
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onScrollEndDrag={handleScrollEndDrag}
        contentContainerStyle={styles.listContent}
      >
        <GroupRouteListView
          routes={routes}
          memberIds={groupMap.getMemberIds()}
          selectedRouteId={groupMap.getSelectedRouteId()}
          onSelect={onSelectRoute}
          onDelete={onDeleteRoute}
          canDelete={route => routeList.canDelete(route, group)}
          disabled={routeList.isSubmitting()}
        />
      </ScrollView>
    );
  };

  if (segment === RouteListSegment.Points) {
    return (
      <View style={sectionStyle}>
        {renderPointList()}
        {/* 상한에 닿으면 지도의 `포인트 추가`가 막힌다 — 목록에도 **그 자리에** 이유를 적는다(GRP-10). */}
        {pointList.isFull() ? (
          <PretendardText style={styles.limit}>
            {getGroupValidationMessage(GroupValidationError.PointLimitExceeded)}
          </PretendardText>
        ) : null}
      </View>
    );
  }

  const isRouteFull = routeList.isFull();
  const isAddDisabled =
    isRouteFull || isAddingRoute || routeList.isSubmitting();

  return (
    <View style={sectionStyle}>
      {renderRouteList()}

      {/* 파일 선택기가 없는 환경에서는 추가 액션 자체를 그리지 않는다(APP-5). */}
      {routeList.canAdd() ? (
        <View style={styles.footer}>
          {/* 상한에 닿으면 버튼을 막고 **그 자리에** 이유를 적는다 — 눌리지 않는 버튼만 두면 왜 안 되는지 모른다(HIG). */}
          {isRouteFull ? (
            <PretendardText style={styles.limit}>
              {getGroupValidationMessage(
                GroupValidationError.RouteLimitExceeded
              )}
            </PretendardText>
          ) : null}
          {/* 흰 보조 알약 — 라임은 지도의 `포인트 추가` 하나다(HM-8). 시트 면 위라 그림자 대신 헤어라인 테두리. */}
          <TouchableOpacity
            style={[styles.addButton, isRouteFull && styles.disabled]}
            onPress={onAddRoute}
            disabled={isAddDisabled}
            activeOpacity={0.8}
            accessibilityRole='button'
            accessibilityLabel={l10n.t('group.route.add')}
            accessibilityState={{
              disabled: isAddDisabled,
              busy: isUploadingRoute,
            }}
          >
            {isUploadingRoute ? (
              <ActivityIndicator size='small' color={Acg.ink} />
            ) : (
              <Ionicons name='add' size={20} color={Acg.ink} />
            )}
            <PretendardText weight='semibold' style={styles.addLabel}>
              {l10n.t(
                isUploadingRoute ? 'group.route.uploading' : 'group.route.add'
              )}
            </PretendardText>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  // 시트 안에서는 시트 높이가 곧 목록 높이다 — 섹션이 남는 세로를 다 쓰고 목록이 그 안을 채운다.
  section: {
    flex: 1,
    paddingHorizontal: AcgLayout.screenPadding,
    backgroundColor: Acg.paper,
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
    gap: 8,
  },
  list: {
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
  // 다시 시도 — 연회색 알약, 44pt 터치(HIG). 배낭 코스 화면의 실패 표시와 같은 면.
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
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
  },
  disabled: {
    opacity: 0.5,
  },
  addLabel: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(GroupMapSheetListView);
