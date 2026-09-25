import { FC } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  MAP_BAND_HEIGHT,
  STANDALONE_BOTTOM_GAP,
} from '@/components/bag-snapshot/SnapshotMapBandView';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgLayout, AcgRadius, AcgType } from '@/constants/DesignTokens';
import app from '@/model/app/App';

interface Props {
  onPress: () => void;
}

/**
 * 그룹 상세의 빈 지도 밴드 (GRP-7) — 코스·포인트·등록 박지가 모두 없을 때.
 *
 * 상세에는 코스·포인트 섹션이 없으므로, 처음 추가할 입구가 **밴드와 같은 자리·같은 높이**로
 * 늘 있어야 한다. 콘텐츠 면이라 연회색 채움 + 모서리 12, 그림자 없음(HM-8). 누를 수 있다는 것은
 * 색이 아니라 셰브론이 알린다. 밴드 전체가 하나의 버튼이다(높이 110 — 44pt 이상).
 */
const GroupDetailEmptyBandView: FC<Props> = ({ onPress }) => {
  const l10n = app.getL10n();
  const label = l10n.t('group.detail.emptyBand');

  return (
    <Pressable
      style={({ pressed }) => [styles.band, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole='button'
      accessibilityLabel={label}
      accessibilityHint={l10n.t('group.detail.openMapBand')}
    >
      <PretendardText style={styles.label} numberOfLines={2}>
        {label}
      </PretendardText>
      <Ionicons name='chevron-forward' size={16} color={Acg.ink} />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  // 지도 밴드(`GroupDetailMapBandView`·박지 밴드)와 같은 높이·모서리·아래 간격이다.
  band: {
    height: MAP_BAND_HEIGHT,
    marginBottom: STANDALONE_BOTTOM_GAP,
    borderRadius: AcgRadius.thumb,
    backgroundColor: Acg.controlFill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: AcgLayout.screenPadding,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    ...AcgType.control,
    color: Acg.ink,
    flexShrink: 1,
    textAlign: 'center',
  },
});

export default GroupDetailEmptyBandView;
