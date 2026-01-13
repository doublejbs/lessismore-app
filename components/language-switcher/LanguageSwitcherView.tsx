import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';
import PretendardText from '@/components/PretendardText';
import app from '@/model/app/App';

const LanguageSwitcherView = observer(() => {
  const { t } = useTranslation();
  const languageStore = app.getLanguageStore();

  const handleLanguageChange = async (language: 'ko' | 'ja') => {
    await languageStore?.changeLanguage(language);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          languageStore?.isKorean() && styles.activeButton,
        ]}
        onPress={() => handleLanguageChange('ko')}
      >
        <PretendardText
          style={[
            styles.buttonText,
            languageStore?.isKorean() && styles.activeButtonText,
          ]}
        >
          {t('language.korean')}
        </PretendardText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.button,
          languageStore?.isJapanese() && styles.activeButton,
        ]}
        onPress={() => handleLanguageChange('ja')}
      >
        <PretendardText
          style={[
            styles.buttonText,
            languageStore?.isJapanese() && styles.activeButtonText,
          ]}
        >
          {t('language.japanese')}
        </PretendardText>
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: 'Pretendard-Regular',
    color: '#999999',
  },
  activeButtonText: {
    color: '#000000',
    fontFamily: 'Pretendard-Bold',
  },
});

export default LanguageSwitcherView;
