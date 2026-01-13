import { makeAutoObservable } from 'mobx';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '@/i18n';

const LANGUAGE_STORAGE_KEY = 'app_language';

type Language = 'ko' | 'ja';

class LanguageStore {
  currentLanguage: Language = 'ko';

  constructor() {
    makeAutoObservable(this);
    this.loadLanguage();
  }

  private async loadLanguage() {
    try {
      const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (savedLanguage === 'ko' || savedLanguage === 'ja') {
        this.currentLanguage = savedLanguage;
        i18n.changeLanguage(savedLanguage);
      }
    } catch (error) {
      console.error('Failed to load language:', error);
    }
  }

  async changeLanguage(language: Language) {
    this.currentLanguage = language;
    i18n.changeLanguage(language);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }

  getLanguage(): Language {
    return this.currentLanguage;
  }

  isKorean(): boolean {
    return this.currentLanguage === 'ko';
  }

  isJapanese(): boolean {
    return this.currentLanguage === 'ja';
  }
}

export default LanguageStore;
