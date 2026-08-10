import { FC } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import { Liquid, LiquidMotion, LiquidRadius } from '@/constants/DesignTokens';

// 점선 슬롯 높이(목업 §9). 고정 높이가 아니라 **바닥값**이라야 OS 글자 크기를 키웠을 때
// 아이콘·문구가 잘리지 않고 행이 함께 늘어난다(Dynamic Type). HIG 최소 터치 타깃 44pt 이상.
const SLOT_HEIGHT = 56;

interface Props {
  busy: boolean;
  onPress: () => void;
}

// 사진이 없을 때의 업로드 진입점(GD-13).
// 이미지 자리를 대신 차지하는 플레이스홀더가 아니라 **액션**이라 점선 슬롯으로 둔다 —
// 사진 없는 장비가 다수라 빈 칸을 남기지 않는 텍스트 우선 레이아웃을 해치지 않아야 한다(GD-1).
const WarehouseDetailImageAddView: FC<Props> = ({ busy, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={busy}
      activeOpacity={LiquidMotion.pressOpacity}
      accessibilityRole='button'
      accessibilityLabel='사진 추가'
      accessibilityState={{ disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator size='small' color={Liquid.inkMuted} />
      ) : (
        <Ionicons name='camera-outline' size={19} color={Liquid.inkMuted} />
      )}
      <PretendardText weight='medium' style={styles.text}>
        {busy ? '사진 올리는 중' : '사진 추가'}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: SLOT_HEIGHT,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    // 점선은 실선 헤어라인보다 굵게 그려져 같은 농도면 무거워 보인다 — 전용 값을 쓴다.
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Liquid.dashedStroke,
    borderRadius: LiquidRadius.tile,
  },
  text: {
    fontSize: 14,
    color: Liquid.inkMuted,
  },
});

export default WarehouseDetailImageAddView;
