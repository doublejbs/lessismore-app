import { observer } from 'mobx-react-lite';
import { FC } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Layout from '@/components/Layout';
import PretendardText from '@/components/PretendardText';
import InfoSubScreenHeaderView, {
  IOS_EDGES,
  IS_IOS,
  NATIVE_HEADER_HEIGHT,
} from '@/components/info/InfoSubScreenHeaderView';
import { Acg, AcgType, Color, Spacing } from '@/constants/DesignTokens';
import app from '@/model/app/App';
import AppLanguage from '@/model/l10n/AppLanguage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LANGUAGE_OPTIONS: readonly {
  language: AppLanguage | null;
  label: string;
  labelKey?: string;
}[] = [
  {
    language: null,
    label: '',
    labelKey: 'info.language.system',
  },
  { language: AppLanguage.Korean, label: '한국어' },
  { language: AppLanguage.English, label: 'English' },
  { language: AppLanguage.Japanese, label: '日本語' },
];

const LanguageSettingsView: FC = observer(() => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  const languageOverride = l10n.getLanguageOverride();

  const handleLanguageSelect = (language: AppLanguage | null) => {
    void l10n.setLanguage(language);
  };

  return (
    <Layout edges={IS_IOS ? IOS_EDGES : undefined}>
      <InfoSubScreenHeaderView title={l10n.t('info.language.title')} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          IS_IOS && {
            paddingTop: insets.top + NATIVE_HEADER_HEIGHT + Spacing.item,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {LANGUAGE_OPTIONS.map(option => {
            const selected = option.language === languageOverride;
            const label = option.labelKey
              ? l10n.t(option.labelKey)
              : option.label;

            return (
              <Pressable
                key={option.language ?? 'system'}
                onPress={() => handleLanguageSelect(option.language)}
                accessibilityRole='radio'
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <PretendardText style={styles.label}>
                  {label}
                </PretendardText>
                {selected && (
                  <Ionicons
                    name='checkmark'
                    size={22}
                    color={Color.textPrimary}
                    accessibilityLabel='선택됨'
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </Layout>
  );
});

const styles = StyleSheet.create({
  content: {
    paddingTop: Spacing.item,
    paddingBottom: 40,
  },
  list: {
    borderTopWidth: 1,
    borderTopColor: Acg.hairline,
  },
  row: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Acg.hairline,
  },
  rowPressed: {
    backgroundColor: Color.surfaceMuted,
  },
  label: {
    ...AcgType.rowTitle,
    color: Acg.ink,
  },
});

export default LanguageSettingsView;
