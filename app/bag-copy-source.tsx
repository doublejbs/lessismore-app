import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Color } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import BagItem from '@/model/bag/BagItem';

// BAG-5: 배낭 추가 → '기존 배낭 복사하기'에서 원본을 고르는 네이티브 formSheet.
// 목록은 전역 BagStore에서 직접 읽고, 선택 시 시트를 닫은 뒤 복사 폼(JS 모달)을 연다.
const BagCopySourceScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [bags, setBags] = useState<BagItem[]>([]);

  useEffect(() => {
    let mounted = true;
    app
      .getBagStore()
      ?.getList()
      .then(list => {
        if (mounted) {
          setBags(list);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = (bagItem: BagItem) => {
    router.push({
      pathname: '/bag-copy',
      params: {
        sourceId: bagItem.getID(),
        sourceName: bagItem.getName(),
        entrySource: 'add_sheet',
      },
    });
  };

  return (
    <View
      style={[styles.container, { paddingBottom: Math.max(insets.bottom - 16, 12) }]}
    >
      <View style={styles.header}>
        <PretendardText style={styles.title} weight='bold'>
          복사할 배낭 선택
        </PretendardText>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        {bags.map((bagItem, index) => (
          <TouchableOpacity
            key={bagItem.getID()}
            style={[styles.row, index === 0 && styles.rowFirst]}
            activeOpacity={0.7}
            onPress={() => handleSelect(bagItem)}
          >
            <View style={styles.rowText}>
              <PretendardText weight='semibold' style={styles.name}>
                {bagItem.getName()}
              </PretendardText>
              <PretendardText style={styles.date}>
                {bagItem.getDate()}
              </PretendardText>
            </View>
            <PretendardText weight='semibold' style={styles.weight}>
              {bagItem.getWeight()}kg
            </PretendardText>
            <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Color.background,
    paddingHorizontal: 20,
    paddingTop: 8,
    // formSheet fitToContents가 지나치게 커지지 않도록 상한.
    maxHeight: 520,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    color: Color.textPrimary,
  },
  scrollView: {
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Color.borderLight,
  },
  rowFirst: {
    borderTopWidth: 0,
  },
  rowText: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    lineHeight: 22,
    color: Color.textPrimary,
  },
  date: {
    fontSize: 13,
    lineHeight: 18,
    color: Color.textSecondary,
  },
  weight: {
    fontSize: 15,
    color: Color.textPrimary,
  },
});

export default BagCopySourceScreen;
