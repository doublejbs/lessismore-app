import { FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '@/components/PretendardText';
import { Liquid, LiquidMotion, LiquidShadow } from '@/constants/DesignTokens';

interface Props {
  label: string;
  /** 선택 상태 — 잉크 채움 + 흰 글자 */
  selected?: boolean;
  /** 'sm'은 2차(세분) 필터용 */
  size?: 'md' | 'sm';
  /** 라벨 앞 색 도트 — 지도 마커 색 범례를 겸할 때 */
  dotColor?: string;
  /**
   * 라벨 **뒤** 아이콘. 고르는 칩이 아니라 **여닫는 칩**(접힌 줄을 펼치거나 시트를 여는
   * 자리)에만 준다 — 탐색 필터 바의 컨트롤 칩이 쓰는 문법(쉐브론은 라벨 뒤)과 같다.
   * 색은 선택 여부에 따라 라벨과 같은 계열로 따라간다.
   */
  trailingIcon?: keyof typeof Ionicons.glyphMap;
  /**
   * **지도 타일 위**에 얹는 칩(목업 §4). 비선택 채움을 한 단계 진하게 하고 그림자를 깔아
   * 지형·도로·라벨에서 칩을 떼어 놓는다 — 지면 위 톤(`chipFill`)은 지도 위에서 라벨이 겹쳐
   * 읽혔다(2026-08-03 실기기 확인). 선택(잉크 채움)은 지면 위와 같다.
   */
  onMap?: boolean;
  /**
   * 없으면 **표시용 태그**로 그린다(누를 수 없음). 장비 상세의 카테고리·색상 태그처럼
   * 같은 알약 문법으로 사실만 말하는 자리에 쓴다 — 누를 수 없는 것에 `button` 롤을 붙이면
   * 스크린리더가 하지도 못할 동작을 약속한다(`LiquidAddCta`와 같은 처리).
   */
  onPress?: () => void;
  /**
   * 스크린리더 롤. 기본은 `button`이고, 한 줄에서 하나만 골라 화면 내용을 바꾸는 구간
   * 전환(약관·정책 문서 탭)은 `tab`을 넘긴다 — 같은 알약이라도 필터를 켜는 것과 보고 있는
   * 문서를 바꾸는 것은 다른 약속이다.
   */
  role?: 'button' | 'tab';
}

/**
 * 칩은 h34(2차 28)로 그리는데 HIG 최소 터치 타깃은 44다. 시각 높이를 키우면 칩 줄이 두꺼워져
 * 위계가 흔들리므로 세로 여유로만 확보한다 — 크기별로 44를 채우는 값이 다르다:
 * (44 − 34) / 2 = 5 → 6, (44 − 28) / 2 = 8.
 * 가로는 0 — 가로 스크롤에서 이웃 칩과 겹친다.
 */
const CHIP_HIT_SLOP = {
  md: { top: 6, bottom: 6, left: 0, right: 0 },
  sm: { top: 8, bottom: 8, left: 0, right: 0 },
} as const;

/**
 * Liquid Depth 필터·카테고리 칩(핸드오프 Chip). 완전한 알약이며 선택 시 잉크 채움.
 * 고정 높이 대신 minHeight — Dynamic Type으로 글자가 커져도 잘리지 않는다.
 */
const LiquidChip: FC<Props> = ({
  label,
  selected = false,
  size = 'md',
  dotColor,
  trailingIcon,
  onMap = false,
  onPress,
  role = 'button',
}) => {
  const height = size === 'sm' ? 28 : 34;
  const shape = [
    styles.chip,
    { minHeight: height, borderRadius: height / 2 },
    selected ? styles.chipSelected : styles.chipIdle,
    !selected && onMap && styles.chipIdleOnMap,
  ];

  const content = (
    <>
      {dotColor ? (
        <View
          style={[
            styles.dot,
            { backgroundColor: dotColor },
            // 잉크 채움 위에서 어두운 도트가 묻히지 않게 흰 테두리를 두른다 — 도트는 지도 마커
            // 색 범례를 겸하므로 선택 상태에서도 색이 읽혀야 한다(CS-2).
            selected && styles.dotSelected,
          ]}
        />
      ) : null}
      <PretendardText
        weight={selected ? 'semibold' : 'medium'}
        style={[
          styles.label,
          selected ? styles.labelSelected : styles.labelIdle,
        ]}
        numberOfLines={1}
      >
        {label}
      </PretendardText>
      {trailingIcon ? (
        <Ionicons
          name={trailingIcon}
          size={15}
          color={selected ? Liquid.surface : Liquid.inkMuted}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return <View style={shape}>{content}</View>;
  }

  return (
    <TouchableOpacity
      style={shape}
      onPress={onPress}
      activeOpacity={LiquidMotion.pressOpacity}
      hitSlop={CHIP_HIT_SLOP[size]}
      accessibilityRole={role}
      accessibilityState={{ selected }}
      accessibilityLabel={label}
    >
      {content}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    gap: 6,
  },
  chipIdle: {
    backgroundColor: Liquid.chipFill,
    borderWidth: 0.5,
    borderColor: Liquid.chipStroke,
  },
  chipIdleOnMap: {
    backgroundColor: Liquid.glassFillOnMap,
    boxShadow: LiquidShadow.glassSm,
  },
  chipSelected: {
    backgroundColor: Liquid.ink,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotSelected: {
    borderWidth: 1,
    borderColor: Liquid.surface,
  },
  label: {
    fontSize: 13.5,
  },
  labelIdle: {
    color: Liquid.inkSecondary,
  },
  labelSelected: {
    color: Liquid.surface,
  },
});

export default LiquidChip;
