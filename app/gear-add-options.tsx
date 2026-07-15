import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color, Radius } from '@/constants/DesignTokens';

// GE-8: 장비 추가 진입 시트 — 배낭 추가 시트(BAG-2, bag-add-options)와 동일한 네이티브 formSheet.
// 검색으로 추가 / 직접 입력 두 갈래. 배낭 편집에서 진입하면 bagId를 넘겨 해당 배낭 컨텍스트로 이어간다.
// 항목 선택 시 탭으로 돌아가지 않고 다음 화면으로 바로 replace(중간 탭 리로드 노출 방지).
const GearAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { bagId } = useLocalSearchParams<{ bagId?: string }>();

  const select = (type: 'search' | 'custom') => {
    if (type === 'search') {
      router.replace(bagId ? `/search?bagId=${bagId}` : '/search');
    } else {
      router.replace(bagId ? `/custom/bag-gear/${bagId}` : '/custom');
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom - 16, 12) },
      ]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          장비 추가
        </PretendardText>
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('search')}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='검색으로 추가'
      >
        <View style={styles.iconTile}>
          <Ionicons name='search' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            검색으로 추가
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            카탈로그에서 찾아 담아요
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('custom')}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel='직접 입력'
      >
        <View style={styles.iconTile}>
          <Ionicons name='create-outline' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            직접 입력
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            제품 정보를 직접 입력해요
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

export default GearAddOptionsScreen;
