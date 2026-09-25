import { FC } from 'react';
import { observer } from 'mobx-react-lite';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import RouteElevationChartView from '@/components/route/RouteElevationChartView';
import { getRouteMetaParts } from '@/components/route/RouteRowParts';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import GroupRoute from '@/model/group/GroupRoute';
import { RouteElevationSample } from '@/model/route/RouteElevation';

interface Props {
  route: GroupRoute;
  // 머리 줄 탭 → 코스 목록 시트. 코스가 하나여도 연다 — 뒤집기·삭제가 시트 `⋯`에만 있다(GRP-10).
  onOpenList: () => void;
  onScrub: (sample: RouteElevationSample | null) => void;
  // 이 패널이 화면 맨 아래에 붙으므로 세이프에어리어를 여기서 비운다.
  bottomInset: number;
}

// 머리 줄만 있을 때(고도 없는 코스) 아래 여백 — 그래프가 있을 때 그래프가 두는 여백과 같다.
const PANEL_BOTTOM_GAP = 12;

/**
 * 그룹 지도 아래 코스 패널 (GRP-8 · GRP-10) — 선택 코스 머리 줄 + 고도 그래프.
 *
 * 머리 줄은 `이름 · 거리 · 상승 ›`이다. 코스 칩을 없앤 자리에서 "지금 어느 코스를 보고 있는가"를
 * 말하고, 누르면 코스 목록 시트가 뜬다(코스 수와 무관 — 방향 뒤집기·삭제가 시트 `⋯`에만 있다). **고도가 없는 코스도 머리 줄은 보인다** — 그래프만 없다.
 * 빈 그래프 틀은 "데이터를 못 불러왔다"로 읽히므로 그래프 자리는 그대로 비운다.
 *
 * 메타는 목록 행과 같은 조각(`getRouteMetaParts` — 거리 · 상승 · 역방향)이라 시트의 행과 머리 줄이
 * 같은 숫자를 보인다. 숫자가 이름 뒤로 밀려 잘리지 않게, 이름만 줄어들고 메타는 줄지 않는다.
 */
const GroupMapRoutePanelView: FC<Props> = ({
  route,
  onOpenList,
  onScrub,
  bottomInset,
}) => {
  const l10n = app.getL10n();
  const separator = l10n.t('common.metaSeparator');
  const meta = getRouteMetaParts(route).join(separator);
  const profile = route.getElevationProfile();
  const label = `${route.getName()}${separator}${meta}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.head}
        onPress={onOpenList}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={label}
        accessibilityHint={l10n.t('group.map.openRouteList')}
      >
        <PretendardText weight='medium' style={styles.name} numberOfLines={1}>
          {route.getName()}
        </PretendardText>
        <PretendardText style={styles.meta} numberOfLines={1}>
          {`${separator}${meta}`}
        </PretendardText>
        <Ionicons
          name='chevron-forward'
          size={16}
          color={Acg.textSecondary}
          style={styles.chevron}
        />
      </TouchableOpacity>
      {profile ? (
        <RouteElevationChartView
          // 코스를 바꾸면 그래프를 새로 마운트해 이전 코스의 커서가 남지 않게 한다.
          // 방향을 뒤집어도 새로 마운트한다 — 단면이 바뀌므로 커서가 옛 단면 자리에 남지 않게.
          key={`${route.getId()}:${route.isReversed() ? 'r' : 'f'}`}
          profile={profile}
          // 축 거리는 목록 행과 같은 원본 거리로 읽힌다(GRP-8).
          displayDistance={route.getDistance()}
          onScrub={onScrub}
          bottomInset={bottomInset + PANEL_BOTTOM_GAP}
        />
      ) : (
        <View style={{ height: bottomInset + PANEL_BOTTOM_GAP }} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  // 지도 아래 콘텐츠 면이라 그림자가 없다(HM-8). 그래프와 같은 지면색이다.
  container: {
    backgroundColor: Acg.paper,
  },
  head: {
    minHeight: 44,
    paddingTop: 8,
    paddingHorizontal: AcgLayout.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    ...AcgType.rowTitle,
    color: Acg.ink,
    flexShrink: 1,
  },
  // 메타는 잉크다 — 거리·상승은 정보다(HM-8).
  meta: {
    ...AcgType.rowSubtitle,
    color: Acg.ink,
    flexShrink: 0,
  },
  chevron: {
    marginLeft: 'auto',
    paddingLeft: AcgLayout.chipGap,
  },
});

export default observer(GroupMapRoutePanelView);
