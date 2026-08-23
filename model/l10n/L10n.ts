import dayjs from 'dayjs';
import 'dayjs/locale/en';
import 'dayjs/locale/ja';
import 'dayjs/locale/ko';
import { getLocales } from 'expo-localization';
import i18next, {
  changeLanguage,
  init,
  t,
  type PostProcessorModule,
  type TOptions,
} from 'i18next';
import { josa } from 'josa';
import { makeAutoObservable } from 'mobx';
import ko from '@/locales/ko.json';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import AppLanguage from './AppLanguage';
import LocalStorageManager from '@/model/storage/LocalStorageManager';

const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';

const KO_JOSA_POST_PROCESSOR: PostProcessorModule = {
  name: 'koJosa',
  type: 'postProcessor',
  process: value => {
    const patterns: readonly (readonly [RegExp, string])[] = [
      [/(^|\s)(\S+?)(?:을|를)\((?:을|를)\)/g, '을'], // l10n-ignore
      [/(^|\s)(\S+?)(?:은|는)\((?:은|는)\)/g, '은'], // l10n-ignore
      [/(^|\s)(\S+?)(?:이|가)\((?:이|가)\)/g, '이'], // l10n-ignore
      [/(^|\s)(\S+?)(?:와|과)\((?:와|과)\)/g, '와'], // l10n-ignore
      [/(^|\s)(\S+?)(?:으로|로)\((?:으로|로)\)/g, '으로'], // l10n-ignore
    ];

    return patterns.reduce(
      (result, [pattern, marker]) =>
        result.replace(pattern, (_match, prefix: string, noun: string) => {
          return `${prefix}${josa(`${noun}#{${marker}}`)}`;
        }),
      value
    );
  },
};

const isAppLanguage = (value: unknown): value is AppLanguage => {
  return Object.values(AppLanguage).includes(value as AppLanguage);
};

const getSystemLanguage = (): AppLanguage => {
  const languageCode = getLocales()[0]?.languageCode?.toLowerCase() ?? '';

  if (languageCode.startsWith('ko')) {
    return AppLanguage.Korean;
  }

  if (languageCode.startsWith('ja')) {
    return AppLanguage.Japanese;
  }

  if (languageCode.startsWith('en')) {
    return AppLanguage.English;
  }

  return AppLanguage.English;
};

const ensurePluralRules = () => {
  if (
    typeof Intl === 'undefined' ||
    typeof Intl.PluralRules !== 'function'
  ) {
    // Hermes 구버전처럼 PluralRules가 없는 런타임에서만 폴리필이 전역을 보완한다.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require('intl-pluralrules');
  }
};

class L10n {
  public language: AppLanguage = AppLanguage.Korean;

  private initialized = false;

  public constructor() {
    makeAutoObservable(this);
  }

  public async initialize() {
    if (this.initialized) {
      return;
    }

    ensurePluralRules();

    if (!i18next.isInitialized) {
      // eslint-disable-next-line import/no-named-as-default-member
      i18next.use(KO_JOSA_POST_PROCESSOR);
      await init({
        resources: {
          [AppLanguage.Korean]: { translation: ko },
          [AppLanguage.English]: { translation: en },
          [AppLanguage.Japanese]: { translation: ja },
        },
        lng: AppLanguage.Korean,
        fallbackLng: AppLanguage.Korean,
        supportedLngs: Object.values(AppLanguage),
        load: 'languageOnly',
        interpolation: {
          escapeValue: false,
        },
        returnEmptyString: false,
        parseMissingKeyHandler: key => {
          if (__DEV__) {
            console.warn(`Missing localization key: ${key}`);
          }

          return '';
        },
      });
    }

    const storedLanguage = await LocalStorageManager.get<unknown>(
      APP_LANGUAGE_STORAGE_KEY
    );
    const languageOverride = isAppLanguage(storedLanguage)
      ? storedLanguage
      : null;

    if (storedLanguage !== null && languageOverride === null) {
      await LocalStorageManager.remove(APP_LANGUAGE_STORAGE_KEY);
    }

    await this.applyLanguage(languageOverride ?? getSystemLanguage());
    this.initialized = true;
  }

  // 언어 설정 UI에는 `시스템 설정 따르기` 항목이 없다(2026-08-23 사용자 결정) —
  // 저장값이 없는 동안만 시스템 로캘을 따르고, 한 번 고르면 그 선택이 저장된다.
  public async setLanguage(language: AppLanguage) {
    await changeLanguage(language);
    this.language = language;
    dayjs.locale(language);

    await LocalStorageManager.set(APP_LANGUAGE_STORAGE_KEY, language);
  }

  public t(key: string, params?: TOptions) {
    // MobX observer가 언어 전환을 추적하도록 i18next 호출 전에 observable을 읽는다.
    const language = this.language;
    const options: TOptions = { ...params, lng: language };

    if (language === AppLanguage.Korean) {
      options.postProcess = 'koJosa';
    }

    return t(key, options);
  }

  private async applyLanguage(language: AppLanguage) {
    await changeLanguage(language);
    this.language = language;
    dayjs.locale(language);
  }
}

export default L10n;
