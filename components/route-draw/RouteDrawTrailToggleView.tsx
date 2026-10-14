import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import RouteDraw from '@/model/route-draw/RouteDraw';

interface Props {
  routeDraw: RouteDraw;
}

// 칩 문법(HM-8): 최소 높이 36 + 위아래 hitSlop 4 = 44pt 터치.
const CHIP_MIN_HEIGHT = 36;
const CHIP_HIT_SLOP = { top: 4, bottom: 4, left: 0, right: 0 };
const ICON_SIZE = 16;
// 칩 안쪽 여백(칩 문법 — `CategoryChipView`와 같은 값).
const CHIP_PADDING_V = 8;
const CHIP_PADDING_H = 12;
// 저장 중 비활성 표시.
const DISABLED_OPACITY = 0.5;
const PRESSED_OPACITY = 0.7;

/**
 * `등산로 따라` 토글 칩 (RD-6) — 하단 바 안 첫 줄 왼쪽. 켬 = 잉크 채움 + 흰 글자, 끔 = 연회색 + 잉크(선택지 칩 문법 —
 * 라임 아님, 라임은 `저장` 하나다). 이미 그린 구간은 그대로고 다음 구간부터 적용된다.
 */
const RouteDrawTrailToggleView: FC<Props> = ({ routeDraw }) => {
  const l10n = app.getL10n();
  const checked = routeDraw.isTrailEnabled();
  const saving = routeDraw.isSaving();
  const color = checked ? Acg.paper : Acg.ink;

  const handlePress = () => {
    routeDraw.toggleTrail();
  };

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        checked ? styles.chipOn : styles.chipOff,
        saving && styles.disabled,
      ]}
      onPress={handlePress}
      disabled={saving}
      activeOpacity={PRESSED_OPACITY}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole='switch'
      accessibilityLabel={l10n.t('routeDraw.trailToggle')}
      accessibilityHint={l10n.t('routeDraw.trailToggleHint')}
      accessibilityState={{ checked, disabled: saving }}
    >
      <Ionicons name='trail-sign-outline' size={ICON_SIZE} color={color} />
      <PretendardText weight='medium' style={[styles.label, { color }]}>
        {l10n.t('routeDraw.trailToggle')}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: AcgLayout.chipGap,
    minHeight: CHIP_MIN_HEIGHT,
    paddingVertical: CHIP_PADDING_V,
    paddingHorizontal: CHIP_PADDING_H,
    borderRadius: AcgRadius.chip,
  },
  chipOn: {
    backgroundColor: Acg.ink,
  },
  chipOff: {
    backgroundColor: Acg.controlFill,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  label: {
    ...AcgType.control,
  },
});

export default observer(RouteDrawTrailToggleView);
