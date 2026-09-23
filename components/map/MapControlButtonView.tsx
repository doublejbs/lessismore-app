import { FC } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Acg, AcgShadow } from '@/constants/DesignTokens';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  // 아이콘 전용 컨트롤이라 반드시 넘긴다(HIG).
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean | undefined;
}

const BUTTON_SIZE = 46;

/**
 * 지도 위 원형 아이콘 버튼 (GRP-10 현재 위치 · BD-11 내 위치 · GRP-8 방향 뒤집기).
 *
 * 그룹 지도의 현재 위치 버튼 모양 그대로다 — 46pt 원(44pt 터치 타깃 이상), 불투명 흰 면 +
 * 헤어라인 테두리, 지도 위 요소라 그림자를 둔다(HM-8). 라임을 쓰지 않는다 — 라임은 화면의
 * 주 액션 하나(`포인트 추가`·`코스 추가`) 몫이다. 자리(우측 16, 지도 아래쪽)는 호출자가 잡는다.
 */
const MapControlButtonView: FC<Props> = ({
  icon,
  accessibilityLabel,
  onPress,
  disabled,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole='button'
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
    >
      <Ionicons name={icon} size={22} color={Acg.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  // 원형 아이콘 버튼은 지도 위에서 불투명이어야 아이콘이 지형에 묻히지 않는다.
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: Acg.paper,
    borderWidth: 1,
    borderColor: Acg.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: AcgShadow.card,
  },
  disabled: {
    opacity: 0.5,
  },
});

export default MapControlButtonView;
