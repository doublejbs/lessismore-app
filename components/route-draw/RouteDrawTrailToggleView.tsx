import { FC } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';

interface Props {
  routeDraw: RouteDraw;
}

// 행 최소 높이 — 스위치(31)와 라벨을 담고 44pt 터치를 준다(HIG).
const ROW_MIN_HEIGHT = 44;
const ICON_SIZE = 18;

/**
 * `등산로 따라` 설정 행 (RD-6) — 하단 바 첫 줄. 켜고 끄는 **설정**이라 칩(선택지 문법)이 아니라 스위치다
 * (2026-10-15 디자인 리뷰 — 칩은 "고르는 것"으로 읽혀 켜짐·꺼짐이 드러나지 않았다). 아이콘 + 라벨 왼쪽, 스위치 오른쪽.
 * 켬 트랙은 잉크(라임은 `저장` 하나 — HM-8). 이미 그린 구간은 그대로고 다음 구간부터 적용된다.
 */
const RouteDrawTrailToggleView: FC<Props> = ({ routeDraw }) => {
  const l10n = app.getL10n();
  const checked = routeDraw.isTrailEnabled();
  const saving = routeDraw.isSaving();

  const handleValueChange = (value: boolean) => {
    if (value !== routeDraw.isTrailEnabled()) {
      routeDraw.toggleTrail();
    }
  };

  return (
    <View style={styles.row}>
      <View
        style={styles.labelWrap}
        importantForAccessibility='no-hide-descendants'
        accessibilityElementsHidden
      >
        <Ionicons name='trail-sign-outline' size={ICON_SIZE} color={Acg.ink} />
        <PretendardText weight='medium' style={styles.label}>
          {l10n.t('routeDraw.trailToggle')}
        </PretendardText>
      </View>
      <Switch
        value={checked}
        onValueChange={handleValueChange}
        disabled={saving}
        trackColor={{ false: Acg.controlFill, true: Acg.ink }}
        ios_backgroundColor={Acg.controlFill}
        accessibilityLabel={l10n.t('routeDraw.trailToggle')}
        accessibilityHint={l10n.t('routeDraw.trailToggleHint')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AcgLayout.chipGap,
  },
  labelWrap: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
  },
});

export default observer(RouteDrawTrailToggleView);
