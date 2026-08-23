import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { observer } from 'mobx-react-lite';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { AcgType, Color, Radius } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import { createQuickBag } from '@/model/bag/QuickBagDefaults';

// BAG-2: 배낭 추가 진입 시트 — iOS/Android 네이티브 formSheet(react-native-screens)로 표시.
// 그래버·드래그 닫기는 OS 레벨. 항목 선택 시 시트를 먼저 닫고, 브리지로 다음 모달을 연다.
const BagAddOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const select = async (type: 'create' | 'copy' | 'template') => {
    if (type === 'copy') {
      // 탭으로 돌아가지 않고 다음 시트로 바로 교체 (중간 탭 리로드 노출 방지).
      router.replace('/bag-copy-source');

      return;
    }

    if (type === 'template') {
      router.replace('/bag-template-source');

      return;
    }

    // 새로 만들기는 입력을 받지 않는다(BAG-2) — 시트를 닫고 바로 만들어 상세로 보낸다.
    router.back();
    await createQuickBag(router);
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
          {app.getL10n().t('bag.add')}
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
            {app.getL10n().t('app.bagAddOptions.create')}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {app.getL10n().t('app.bagAddOptions.createSubtitle')}
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
            {app.getL10n().t('app.bagAddOptions.copy')}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {app.getL10n().t('app.bagAddOptions.copySubtitle')}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>

      <View style={styles.divider} />

      <TouchableOpacity
        style={styles.row}
        onPress={() => select('template')}
        activeOpacity={0.7}
      >
        <View style={styles.iconTile}>
          <Ionicons name='bookmark-outline' size={20} color={Color.textPrimary} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            {app.getL10n().t('app.bagAddOptions.template')}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {app.getL10n().t('app.bagAddOptions.templateSubtitle')}
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
    ...AcgType.sectionTitle,
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
    ...AcgType.rowTitle,
    color: Color.textPrimary,
  },
  rowSubtitle: {
    ...AcgType.meta,
    color: Color.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Color.borderLight,
  },
});

export default observer(BagAddOptionsScreen);
