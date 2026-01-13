import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import ko from './locales/ko.json';
import ja from './locales/ja.json';

const resources: Record<string, { translation: any }> = {
  ko: { translation: ko as any },
  ja: { translation: ja as any },
};

const supportedLanguages = ['ko', 'ja'];

const getDefaultLanguage = (): string => {
  const deviceLanguage = getLocales()[0]?.languageCode || 'ko';
  return supportedLanguages.includes(deviceLanguage) ? deviceLanguage : 'ko';
};

i18n.use(initReactI18next).init({
  resources,
  lng: getDefaultLanguage(),
  fallbackLng: 'ko',
  compatibilityJSON: 'v4',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
