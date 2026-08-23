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

// 언어 이름은 번역하지 않는 자기 표기 고정(L10N-5).
// `시스템 설정 따르기` 행은 두지 않는다(2026-08-23 사용자 결정) — 저장값이 없으면
// 시스템 로캘에서 유도한 언어에 체크가 가고, 사용자가 고르는 순간부터 그 선택이 저장된다.
const LANGUAGE_OPTIONS: readonly { language: AppLanguage; label: string }[] = [
  { language: AppLanguage.Korean, label: '한국어' }, // l10n-ignore: 언어 이름 자기 표기
  { language: AppLanguage.English, label: 'English' },
  { language: AppLanguage.Japanese, label: '日本語' },
];

const LanguageSettingsView: FC = observer(() => {
  const insets = useSafeAreaInsets();
  const l10n = app.getL10n();
  // 저장값이 없어도 현재 적용 언어(시스템 유도)에 체크가 간다.
  const currentLanguage = l10n.language;

  const handleLanguageSelect = (language: AppLanguage) => {
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
            const selected = option.language === currentLanguage;
            const label = option.label;

            return (
              <Pressable
                key={option.language}
                onPress={() => handleLanguageSelect(option.language)}
                accessibilityRole='radio'
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
              >
                <PretendardText style={styles.label}>{label}</PretendardText>
                {selected && (
                  <Ionicons
                    name='checkmark'
                    size={22}
                    color={Color.textPrimary}
                    accessibilityLabel={l10n.t('common.selected')}
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
