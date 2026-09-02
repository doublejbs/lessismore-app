import { observer } from 'mobx-react-lite';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PretendardText from '@/components/PretendardText';
import { Acg, AcgType, Color, Radius } from '@/constants/DesignTokens';
import CommunityPostType from '@/model/community/CommunityPostType';
import app from '@/model/app/App';

const CommunityWriteOptionsScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();

  const selectType = (type: CommunityPostType) => {
    router.replace({
      pathname: '/community/write',
      params: { type },
    } as never);
  };

  const renderTypeRow = (
    type: CommunityPostType,
    icon: keyof typeof Ionicons.glyphMap,
    titleKey:
      | 'community.write.typeSheet.question'
      | 'community.write.typeSheet.bagReview'
      | 'community.write.typeSheet.poll',
    descriptionKey:
      | 'community.write.typeSheet.questionDesc'
      | 'community.write.typeSheet.bagReviewDesc'
      | 'community.write.typeSheet.pollDesc'
  ) => {
    const title = l10n.t(titleKey);

    return (
      <TouchableOpacity
        key={type}
        style={styles.row}
        onPress={() => selectType(type)}
        activeOpacity={0.7}
        accessibilityRole='button'
        accessibilityLabel={title}
      >
        <View style={styles.iconTile}>
          <Ionicons name={icon} size={22} color={Acg.ink} />
        </View>
        <View style={styles.rowTextWrap}>
          <PretendardText style={styles.rowTitle} weight='semibold'>
            {title}
          </PretendardText>
          <PretendardText style={styles.rowSubtitle}>
            {l10n.t(descriptionKey)}
          </PretendardText>
        </View>
        <Ionicons name='chevron-forward' size={18} color={Color.iconMuted} />
      </TouchableOpacity>
    );
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
          {l10n.t('community.write.typeSheet.title')}
        </PretendardText>
      </View>
      {renderTypeRow(
        CommunityPostType.Question,
        'help-circle-outline',
        'community.write.typeSheet.question',
        'community.write.typeSheet.questionDesc'
      )}
      <View style={styles.divider} />
      {renderTypeRow(
        CommunityPostType.BagReview,
        'bag-handle-outline',
        'community.write.typeSheet.bagReview',
        'community.write.typeSheet.bagReviewDesc'
      )}
      <View style={styles.divider} />
      {renderTypeRow(
        CommunityPostType.Poll,
        'stats-chart-outline',
        'community.write.typeSheet.poll',
        'community.write.typeSheet.pollDesc'
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Acg.paper,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    ...AcgType.sectionTitle,
    color: Acg.ink,
  },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: Radius.modal,
    backgroundColor: Acg.controlFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
  rowSubtitle: {
    ...AcgType.meta,
    color: Acg.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Acg.hairline,
  },
});

export default observer(CommunityWriteOptionsScreen);
