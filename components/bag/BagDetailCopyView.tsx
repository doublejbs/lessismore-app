import { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Liquid, LiquidMotion } from '@/constants/DesignTokens';

interface Props {
  sourceId: string;
  sourceName: string;
}

// 배낭 상세의 복사 버튼 → 네이티브 복사 폼(formSheet 라우트).
const BagDetailCopyView: FC<Props> = ({ sourceId, sourceName }) => {
  const router = useRouter();

  const handlePressCopy = () => {
    router.push({
      pathname: '/bag-copy',
      params: { sourceId, sourceName, entrySource: 'detail' },
    });
  };

  return (
    <TouchableOpacity
      style={styles.copyButton}
      onPress={handlePressCopy}
      activeOpacity={LiquidMotion.pressOpacity}
      // 시각 크기는 아이콘 20pt(목업 §6 유리 캡슐)이고 칸은 헤더가 잡는다.
      // 세로는 여유로 44pt를 채우고(20 + 12 × 2), 가로는 7까지만 넓힌다 —
      // 칸 34 안 아이콘 좌우 여백이 7이고 칸 사이 gap이 2라, 그 이상 주면 이웃 아이콘의
      // 히트 영역과 겹쳐 잘못된 화면이 열린다.
      hitSlop={{ top: 12, bottom: 12, left: 7, right: 7 }}
      accessibilityRole='button'
      accessibilityLabel='복사'
    >
      <IconSymbol name='doc.on.doc' size={20} color={Liquid.ink} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  copyButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default BagDetailCopyView;
