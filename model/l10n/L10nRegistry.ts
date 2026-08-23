import AppLanguage from './AppLanguage';

// Gear처럼 App→GearStore→Gear 사슬 말단에 있는 모델이 앱 언어를 읽을 때 쓰는 레지스트리(L10N-13).
// `app` 싱글톤을 직접 import하면 순환이 생기므로, L10n이 생성 시점에 자신을 등록하고
// 소비자는 이 함수로만 읽는다. `language`가 MobX observable이라 observer 컴포넌트가
// 언어 전환에 반응한다(L10N-2).
interface LanguageSource {
  language: AppLanguage;
}

let source: LanguageSource | null = null;

export const registerL10n = (l10n: LanguageSource) => {
  source = l10n;
};

export const getAppLanguage = (): AppLanguage => {
  return source?.language ?? AppLanguage.Korean;
};
