import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import SortOptionRow from '@/components/sort/SortOptionRow';
import { Color } from '@/constants/DesignTokens';
import {
  getSortSheetContext,
  clearSortSheetContext,
} from '@/model/sort/SortSheetHandoff';

// FD-3 / WH-3 / SR-7: 피드·창고·탐색이 공유하는 공용 정렬 formSheet 라우트.
// 트리거가 모듈 핸드오프에 넣은 옵션·현재값·onSelect를 스냅샷으로 렌더한다(뷰 스코프 인스턴스라 props 대신 콜백 위임).
// 그래버·드래그 닫기·높이(fitToContents)는 OS가 처리하므로 딤/핸들/제스처 코드는 두지 않는다.
const SortSheetScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const context = getSortSheetContext();

  // 컨텍스트 없이 진입한 경우(딥링크 등) 즉시 닫는다. 렌더 부수효과 대신 effect에서 네비게이션.
  useEffect(() => {
    if (!context) {
      router.back();

      return;
    }

    // 언마운트(닫힘) 시 핸드오프를 정리한다.
    return () => {
      clearSortSheetContext();
    };
  }, []);

  if (!context) {
    return null;
  }

  const handleSelect = (key: string) => {
    context.onSelect(key);
    router.back();
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          정렬
        </PretendardText>
      </View>

      {context.options.map(option => (
        <SortOptionRow
          key={option.key}
          label={option.label}
          selected={context.selectedKey === option.key}
          onPress={() => handleSelect(option.key)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
  },
});

export default SortSheetScreen;
