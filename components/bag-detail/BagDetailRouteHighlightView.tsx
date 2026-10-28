import { FC } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagDetail from '@/model/bag-detail/BagDetail';
import RouteDrawEntry from '@/model/route-draw/RouteDrawEntry';
import tileStyles from './BagDetailActionTileStyles';

interface Props {
  bagDetail: BagDetail;
}

/**
 * 상황형 강조 `코스` (BD-10 2026-10-15 개정 · RD-9 #4) — 출발 전·여행 중이고 여행지는 있는데 코스가 없을 때(네이티브)
 * 다음 할 일로 그리드 최상단에 선다. 여행지 강조 카드와 **같은 문법**(검정 전체 폭 가로 카드 — 아이콘·라벨 좌측,
 * 값 우측)이다. 이때 여행지는 회색 타일로 그리드에 남고, 그리드의 `코스` 타일은 이 카드가 대신한다.
 *
 * 탭하면 코스 화면으로 간다 — 코스 0개라 빈 상태 카드가 바로 보인다(RD-9 #1). 그리기를 자동으로 시작하지는 않는다
 * (강조 카드 → 빈 상태 카드 `지도에서 그리기` → 그리기 모드, 탭 3번). `entry=highlight`는 측정 퍼널용이다.
 */
const BagDetailRouteHighlightView: FC<Props> = ({ bagDetail }) => {
  const router = useRouter();
  const l10n = app.getL10n();
  const label = l10n.t('bag.route.highlightLabel');
  const value = l10n.t('bag.route.highlightValue');
  const fg = Color.background;
  const subFg = Color.iconMuted;

  const handlePress = () => {
    app.getAnalyticsManager()?.logClick('bag_route_highlight');
    router.push({
      pathname: '/bag/[id]/route',
      params: { id: bagDetail.getId(), entry: RouteDrawEntry.Highlight },
    });
  };

  return (
    <TouchableOpacity
      style={[tileStyles.tile, tileStyles.tileEmphasized]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole='button'
      accessibilityLabel={`${label}, ${value}`}
    >
      <View style={tileStyles.emphasizedLead}>
        <Ionicons name='trail-sign-outline' size={24} color={fg} />
        <PretendardText
          style={[tileStyles.title, { color: fg }]}
          weight='semibold'
          numberOfLines={1}
        >
          {label}
        </PretendardText>
      </View>
      <View style={tileStyles.emphasizedValue}>
        <PretendardText
          style={[tileStyles.subtitle, { color: subFg }]}
          numberOfLines={1}
        >
          {value}
        </PretendardText>
      </View>
    </TouchableOpacity>
  );
};

export default observer(BagDetailRouteHighlightView);
