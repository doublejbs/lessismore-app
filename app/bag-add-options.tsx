import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Color, Radius } from '@/constants/DesignTokens';

// BAG-2: 배낭 추가 진입 시트 — iOS/Android 네이티브 formSheet(react-native-screens)로 표시.
// 그래버·드래그 닫기는 OS 레벨. 항목 선택 시 시트를 먼저 닫고, 브리지로 다음 모달을 연다.
const BagAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const select = (type: 'create' | 'copy') => {
    // 탭으로 돌아가지 않고 다음 시트로 바로 교체 (중간 탭 리로드 노출 방지).
    router.replace(type === 'create' ? '/bag-new' : '/bag-copy-source');
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom - 16, 12) }]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          배낭 추가
        </PretendardText>
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('create')}
        activeOpacity={0.7}
      >
        <View style={styles.iconTile}>
          <IconSymbol name='plus' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            새로 만들기
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            빈 배낭으로 시작해요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('copy')}
        activeOpacity={0.7}
      >
        <View style={styles.iconTile}>
          <IconSymbol name='doc.on.doc' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            기존 배낭 복사하기
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            이전 배낭을 그대로 가져와요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.modal,
    backgroundColor: Color.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 16,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
  },
});

export default BagAddOptionsScreen;
