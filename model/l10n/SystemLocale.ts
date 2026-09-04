import { I18nManager, Platform, Settings } from 'react-native';

const getSystemLanguageCode = (): string => {
  let languageCode = '';

  try {
    if (Platform.OS === 'ios') {
      const appleLanguages = Settings.get('AppleLanguages');

      if (Array.isArray(appleLanguages)) {
        if (typeof appleLanguages[0] === 'string') {
          languageCode = appleLanguages[0];
        }
      } else {
        const appleLocale = Settings.get('AppleLocale');

        if (typeof appleLocale === 'string') {
          languageCode = appleLocale;
        }
      }
    } else if (Platform.OS === 'android') {
      const constants = I18nManager.getConstants() as {
        localeIdentifier?: string | null;
      };

      if (typeof constants.localeIdentifier === 'string') {
        languageCode = constants.localeIdentifier;
      }
    } else if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
        languageCode = navigator.language;
      }
    }
  } catch {
    languageCode = '';
  }

  if (languageCode !== '') {
    return languageCode.toLowerCase();
  }

  try {
    return Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  } catch {
    return '';
  }
};

export { getSystemLanguageCode };
