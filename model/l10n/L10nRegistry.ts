import AppLanguage from './AppLanguage';

// Gear처럼 App→GearStore→Gear 사슬 말단에 있는 모델이 앱 언어를 읽을 때 쓰는 레지스트리(L10N-13).
// `app` 싱글톤을 직접 import하면 순환이 생기므로, L10n이 생성 시점에 자신을 등록하고
// 소비자는 이 함수로만 읽는다. `language`가 MobX observable이라 observer 컴포넌트가
// 언어 전환에 반응한다(L10N-2).
interface LanguageSource {
  language: AppLanguage;
  t: (key: string) => string;
}

let source: LanguageSource | null = null;

export const registerL10n = (l10n: LanguageSource) => {
  source = l10n;
};

export const getAppLanguage = (): AppLanguage => {
  return source?.language ?? AppLanguage.Korean;
};

// App 싱글톤을 직접 가져올 수 없는 모델 말단에서 번역을 읽는 진입점이다.
// L10n 생성 전에는 호출되지 않지만, 안전한 폴백으로 키 대신 빈 문자열을 내지 않는다.
export const getAppTranslation = (key: string): string => {
  return source?.t(key) ?? key;
};
