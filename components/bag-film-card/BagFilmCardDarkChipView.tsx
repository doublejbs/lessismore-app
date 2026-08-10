import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import PretendardText from '@/components/PretendardText';
import { FilmCardControlPalette } from '@/components/bag-film-card/FilmCardControlPalette';
import { Radius } from '@/constants/DesignTokens';

interface Props {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  disabled: boolean;
  /**
   * 켜고 끄는 칩인지(BS-7 요소 칩) 여럿 중 하나를 고르는 칩인지(비율 칩) 구분한다.
   *
   * 요소 칩은 둘 다 켜질 수 있어 "선택된 하나"가 아니다 — 스크린 리더에 그대로 알리도록
   * 체크박스 역할과 `checked` 상태로 바꾼다.
   */
  toggle: boolean;
  onPress: () => void;
}

// 칩 높이 34 + 상하 hitSlop 5로 44×44pt 터치 영역을 만든다(HIG).
// 고정 높이를 주지 않아 Dynamic Type로 글자가 커지면 칩도 함께 커진다.
const CHIP_HIT_SLOP = { top: 5, bottom: 5, left: 0, right: 0 };

/**
 * 프리뷰 위에 뜨는 다크 칩(BS-10) — 요소 토글·비율 선택에 쓴다.
 *
 * **앱 공용 `LiquidChip`을 쓰지 않는 이유**: 공용 칩은 흰 배경 아웃라인이라 밝은 사진
 * 위에서 묻힌다. 여기서는 비선택 = 반투명 검정 + 흰 글자, 선택 = 흰 채움 + 검정 글자로
 * 뒤집어 사진 밝기와 무관하게 읽히게 한다(색 근거는 `FilmCardControlPalette` 주석 참고).
 */
const BagFilmCardDarkChipView: FC<Props> = ({
  label,
  accessibilityLabel,
  selected,
  disabled,
  toggle,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected ? styles.chipSelected : styles.chipUnselected,
        disabled ? styles.chipDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      hitSlop={CHIP_HIT_SLOP}
      accessibilityRole={toggle ? 'checkbox' : 'button'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={
        toggle ? { checked: selected, disabled } : { selected, disabled }
      }
    >
      <PretendardText
        weight='medium'
        style={[
          styles.chipText,
          selected ? styles.chipTextSelected : styles.chipTextUnselected,
        ]}
      >
        {label}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 34,
    paddingVertical: 7,
    paddingHorizontal: 14,
    // 앱 공용 칩은 radius 8이지만, 프리뷰 위에 뜨는 컨트롤은 알약으로 통일한다(BS-10) —
    // 같은 줄에 뜨는 원형 버튼·CTA 알약과 형태가 맞아야 한 묶음으로 읽힌다.
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipUnselected: {
    backgroundColor: FilmCardControlPalette.background,
    borderColor: FilmCardControlPalette.border,
  },
  chipSelected: {
    backgroundColor: FilmCardControlPalette.selectedBackground,
    borderColor: FilmCardControlPalette.selectedBackground,
  },
  // 캡처·공유가 도는 동안에는 선택을 바꿀 수 없다(BS-3·BS-7). 잠긴 상태를 눈으로도 알린다.
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 14,
  },
  chipTextUnselected: {
    color: FilmCardControlPalette.foreground,
  },
  chipTextSelected: {
    color: FilmCardControlPalette.selectedForeground,
  },
});

export default BagFilmCardDarkChipView;
