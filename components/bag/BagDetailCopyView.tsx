import React, { FC } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color } from '@/constants/DesignTokens';

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
      activeOpacity={0.7}
      hitSlop={{ top: 9, bottom: 9, left: 9, right: 9 }}
      accessibilityRole='button'
      accessibilityLabel='복사'
    >
      <IconSymbol name='doc.on.doc' size={26} color={Color.textPrimary} />
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
