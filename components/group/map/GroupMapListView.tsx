import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import GroupPointListView from '@/components/group/point/GroupPointListView';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupRoute from '@/model/group/GroupRoute';
import GroupMap from '@/model/group-map/GroupMap';
import GroupPointFilterChipsView from './GroupPointFilterChipsView';

interface Props {
  groupMap: GroupMap;
  onRequestEdit: (point: GroupPoint) => void;
  onRequestDelete: (point: GroupPoint) => void;
  // 코스 행 `⋯` → 삭제(올린 사람·방장만). 확인 알럿은 화면이 띄운다.
  onRequestDeleteRoute: (route: GroupRoute) => void;
}

const CONTENT_BOTTOM_PADDING = 40;

/**
 * 웹의 지도 대체 화면 (GRP-10 · APP-5).
 *
 * 웹은 네이티브 지도 SDK가 없어 지도를 제공하지 않는다 — 대신 코스와 포인트를 목록으로
 * 보여주고, 포인트 수정·삭제와 코스 방향 뒤집기·삭제는 지도 없이도 되는 일이라 여기서 그대로
 * 할 수 있게 둔다(웹에는 그룹 상세의 코스 섹션이 없으므로 코스 삭제의 유일한 자리다).
 * 등록은 좌표를 찍을 지도가 없으므로 제공하지 않는다.
 *
 * **고도 그래프는 웹에도 둔다** — 오르내림은 지도 없이도 읽히는 정보다(GRP-8).
 * 다만 훑기는 달지 않는다: 따라 움직일 지도가 없으면 훑어도 가리킬 곳이 없다.
 */
const GroupMapListView: FC<Props> = ({
  groupMap,
  onRequestEdit,
  onRequestDelete,
  onRequestDeleteRoute,
}) => {
  const l10n = app.getL10n();
  const pointList = groupMap.getPointList();
  const routeList = groupMap.getRouteList();
  const group = groupMap.getGroup();
  const routes = groupMap.getRoutes();
  const memberIds = groupMap.getMemberIds();
  // 고른 코스가 없거나 지워졌으면 첫 코스다(지도 화면과 같은 판정, GRP-10).
  const selectedRoute = groupMap.getSelectedRoute();
  const selectedProfile = selectedRoute?.getElevationProfile() ?? null;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <PretendardText style={styles.notice}>
        {l10n.t('group.map.webNotice')}
      </PretendardText>

      <View style={styles.section}>
        <AcgSectionHeaderView title={l10n.t('group.detail.routesTitle')} />
        {routes.length === 0 ? (
          <PretendardText style={styles.empty}>
            {l10n.t('group.detail.routesEmpty')}
          </PretendardText>
        ) : (
          <>
            <GroupRouteListView
              routes={routes}
              memberIds={memberIds}
              onSelect={route => groupMap.selectRoute(route.getId())}
              selectedRouteId={selectedRoute?.getId() ?? null}
              onDelete={onRequestDeleteRoute}
              canDelete={route => routeList.canDelete(route, group)}
              disabled={routeList.isSubmitting()}
            />
            {/* 고도가 없는 코스는 그래프 자리를 아예 비운다(GRP-8). */}
            {selectedProfile ? (
              <View style={styles.chart}>
                <RouteElevationChartView
                  // 방향을 뒤집으면 단면이 바뀌므로 새로 마운트한다(GRP-8).
                  key={`${selectedRoute?.getId() ?? ''}:${selectedRoute?.isReversed() ? 'r' : 'f'}`}
                  profile={selectedProfile}
                  {...(selectedRoute
                    ? { displayDistance: selectedRoute.getDistance() }
                    : {})}
                />
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={styles.section}>
        <AcgSectionHeaderView title={l10n.t('group.detail.pointsTitle')} />
        {pointList.getCount() > 0 ? (
          <View style={styles.chips}>
            <GroupPointFilterChipsView pointList={pointList} />
          </View>
        ) : null}
        {pointList.getVisiblePoints().length === 0 ? (
          <PretendardText style={styles.empty}>
            {l10n.t('group.detail.pointsEmpty')}
          </PretendardText>
        ) : (
          <GroupPointListView
            pointList={pointList}
            group={groupMap.getGroup()}
            userId={groupMap.getUserId()}
            onEdit={onRequestEdit}
            onDelete={onRequestDelete}
          />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingBottom: CONTENT_BOTTOM_PADDING,
  },
  notice: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
  section: {
    marginTop: AcgLayout.section,
  },
  chips: {
    paddingBottom: 12,
  },
  // 그래프는 화면 좌우 패딩을 스스로 넣으므로, 이미 패딩 안에 있는 이 목록에서는 되돌린다.
  chart: {
    marginTop: 4,
    marginHorizontal: -AcgLayout.screenPadding,
  },
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupMapListView);
