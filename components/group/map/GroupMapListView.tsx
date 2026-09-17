import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { ScrollView, StyleSheet, View } from 'react-native';
import AcgSectionHeaderView from '@/components/acg/AcgSectionHeaderView';
import GroupPointListView from '@/components/group/point/GroupPointListView';
import GroupRouteListView from '@/components/group/route/GroupRouteListView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupPoint from '@/model/group/GroupPoint';
import GroupMap from '@/model/group-map/GroupMap';
import GroupPointFilterChipsView from './GroupPointFilterChipsView';

interface Props {
  groupMap: GroupMap;
  onRequestEdit: (point: GroupPoint) => void;
  onRequestDelete: (point: GroupPoint) => void;
}

const CONTENT_BOTTOM_PADDING = 40;

/**
 * 웹의 지도 대체 화면 (GRP-10 · APP-5).
 *
 * 웹은 네이티브 지도 SDK가 없어 지도를 제공하지 않는다 — 대신 코스와 포인트를 목록으로
 * 보여주고, 포인트 수정·삭제는 지도 없이도 되는 일이라 여기서 그대로 할 수 있게 둔다.
 * 등록은 좌표를 찍을 지도가 없으므로 제공하지 않는다.
 */
const GroupMapListView: FC<Props> = ({
  groupMap,
  onRequestEdit,
  onRequestDelete,
}) => {
  const l10n = app.getL10n();
  const pointList = groupMap.getPointList();
  const routes = groupMap.getRoutes();
  const memberIds = groupMap.getMemberIds();

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
          <GroupRouteListView routes={routes} memberIds={memberIds} />
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
  empty: {
    ...AcgType.body,
    color: Acg.textMuted,
    paddingVertical: 12,
  },
});

export default observer(GroupMapListView);
