import { FC } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PretendardText from '../PretendardText';
import { Acg, Radius } from '@/constants/DesignTokens';

interface Props {
  busy: boolean;
  onPress: () => void;
}

// 사진이 없을 때의 업로드 진입점(GD-13).
// 이미지 자리를 대신 차지하는 플레이스홀더가 아니라 **액션**이라 점선 행으로 둔다 —
// 사진 없는 장비가 다수라 빈 칸을 남기지 않는 텍스트 우선 레이아웃을 해치지 않아야 한다(GD-1).
const WarehouseDetailImageAddView: FC<Props> = ({ busy, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={busy}
      accessibilityRole='button'
      accessibilityLabel='사진 추가'
      accessibilityState={{ disabled: busy }}
    >
      {busy ? (
        <ActivityIndicator size='small' color={Acg.textSecondary} />
      ) : (
        <Ionicons name='camera-outline' size={20} color={Acg.textSecondary} />
      )}
      <PretendardText style={styles.text}>
        {busy ? '사진 올리는 중' : '사진 추가'}
      </PretendardText>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    // HIG 최소 터치 타깃 44pt 이상(GD-13). 고정 높이가 아니라 **바닥값**이라야 OS 글자 크기를
    // 키웠을 때 아이콘·문구가 잘리지 않고 행이 함께 늘어난다(Dynamic Type).
    minHeight: 56,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Acg.line2,
    borderRadius: Radius.card,
  },
  text: {
    fontSize: 14,
    color: Acg.textSecondary,
  },
});

export default WarehouseDetailImageAddView;
