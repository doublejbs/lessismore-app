# 다국어 (i18n) — 영어·일본어 추가

| 항목 | 내용 |
| --- | --- |
| 상태 | implemented `[구현 완료]` (2026-08-23) |
| ID 프리픽스 | `L10N` |
| 주요 코드 | `locales/` (신규), `model/l10n/` (신규), `app/info/language.tsx` (신규), `components/PretendardText.tsx`, `app.json` |
| 관련 스펙 | [AppLifecycle.md](AppLifecycle.md) APP-6, [Auth.md](Auth.md) AU-4, [DataModel.md](DataModel.md), [BagShare.md](BagShare.md) |

> 프리픽스 결정: `L10N`. 후보였던 `LOC`은 위치(location) 도메인(박지·여행지)과 혼동 여지가 있어 배제. 기존 프리픽스와 충돌 없음.

## 1. 개요

앱의 모든 UI 문구는 현재 한국어 하드코딩이다(한국어 리터럴 보유 파일 약 300개 — components 843줄 · model 926줄 · app 119줄 · constants 41줄, 주석 일부 포함. i18n 라이브러리 없음). 이 도메인은 **UI 문구를 번역 리소스로 이관하고 한국어(기본)·영어·일본어를 지원**한다. 언어는 시스템 로캘로 기본 결정하되 정보 탭의 인앱 설정으로 오버라이드할 수 있고, 전환은 앱 재시작 없이 즉시 반영된다.

**사용자 확정 결정(2026-08-23) — 이 스펙의 전제이며 재검토하지 않는다:**

1. 언어 결정: **시스템 로캘 기본 + 인앱 설정 오버라이드**(정보 탭에서 변경).
2. 범위: **UI 문구만.** Firestore 콘텐츠(박지 설명·경고문, 추천 카드 제목·요약 등)는 한국어를 유지한다. 콘텐츠 다국어화는 후속 단계로 §8 미해결 질문에만 남긴다.
3. 지원 언어: **ko(기본) · en · ja.** 번역 초벌은 LLM이 작성하고 사용자가 검수한다.

## 2. 화면 및 진입

```
app/(tabs)/info.tsx (정보 탭)
  └─ `언어` 행 (신규) → app/info/language.tsx → components/info/LanguageSettingsView.tsx (신규)
```

- 진입 경로: 정보 탭 메뉴 목록의 `언어` 행. 라우트는 기존 정보 서브 화면 관례(`/info/policy`, `/info/business`)를 따라 플랫 파일 `app/info/language.tsx`로 둔다.
- 그 외 화면 전부가 간접 영향 범위다 — 문구가 번역 키를 거치게 되므로. 화면별 이관은 L10N-10의 단계 계획을 따른다.

## 3. 요구사항

### L10N-1 지원 언어와 언어 결정 규칙 `[제안]`

사용자는 앱을 자신의 기기 언어로 쓸 수 있고, 원하면 앱 안에서 언어를 직접 고를 수 있다.

**수용 기준**

- 지원 언어는 `ko` · `en` · `ja` 셋이다. 언어 코드는 string enum(`AppLanguage`, 별도 파일 `model/l10n/AppLanguage.ts`)으로 선언한다.
- 결정 우선순위: **① 인앱 설정(저장돼 있으면) > ② 시스템 로캘**.
- 시스템 로캘 → 앱 언어 매핑(폴백 체인): `ko*` → ko, `ja*` → ja, `en*` → en, **그 외 전부 → en**. 즉 한국어 기기만 ko이고, 지원 밖 로캘은 영어로 폴백한다.
- 시스템 로캘은 `expo-localization`의 `getLocales()` 첫 항목의 `languageCode`로 읽는다(신규 의존성 — 현재 미설치).
- 인앱 설정 값은 AsyncStorage 키 **`appLanguage`** 에 저장한다(`LocalStorageManager` 경유, 값은 `'ko' | 'en' | 'ja'`). "시스템 따르기"는 **키 없음**으로 표현한다 — 별도 sentinel 값을 저장하지 않으며, 키가 없는 것은 아직 언어를 고른 적이 없는 기본 상태다(L10N-5 — 시스템 따르기로 되돌리는 UI는 없다). 키는 [AppLifecycle.md](AppLifecycle.md) APP-6 로컬 스토리지 키 목록에 등록한다.
- 앱 시작 시(App.initialize 시퀀스) 저장 값을 1회 읽어 언어를 확정한 뒤 첫 렌더에 반영한다 — 첫 화면이 한국어로 그려졌다가 바뀌는 깜빡임이 없어야 한다.
- **번역 키 폴백은 언어 폴백과 별개다**: en/ja 리소스에 키가 없으면 **ko 값**을 보여준다(ko.json이 단일 소스라 모든 키가 존재). 키 자체가 없으면 키 문자열을 노출하지 말고 ko 폴백 실패 시 빈 문자열 대신 키명을 dev 빌드에서만 경고 로그로 남긴다.

### L10N-2 i18n 인프라 — i18next + MobX observable 연동 `[제안]`

**수용 기준**

- 라이브러리는 **`i18next`(코어) + `expo-localization`** 을 도입한다. **`react-i18next`는 도입하지 않는다**(아래 근거).
- `model/l10n/L10n.ts`(신규, MobX 스토어)가 단일 진입점이다:
  - `language`를 **MobX observable**로 갖는다. `app` 싱글톤에서 `app.getL10n()`으로 접근.
  - 번역 함수 `t(key, params?)`는 **내부에서 먼저 `this.language`(observable)를 읽은 뒤** `i18next.t()`를 호출한다. 이로써 observer 컴포넌트가 — 직접 호출이든 모델 getter를 거치든 — 언어에 대한 MobX 의존성을 자동으로 갖는다.
  - `setLanguage(lang | null)` — null은 시스템 따르기. `i18next.changeLanguage()` 호출 + observable 갱신 + AsyncStorage 저장을 한 트랜잭션으로 처리한다.
- **언어 전환 반영 전략은 "MobX observable 참조"로 확정한다. 루트 remount(key 교체)는 쓰지 않는다.** 근거:
  - 이 앱은 문구의 상당량이 MobX 모델 안에 있다(알럿·토스트 메시지, 모델 getter가 돌려주는 라벨 — model 디렉토리에만 한국어 리터럴 926줄). react-i18next는 React 컴포넌트만 다시 그리므로 observer 컴포넌트가 모델 getter에서 받은 문자열은 안 바뀐다 — 이 앱 구조에서 react-i18next의 반응성은 반쪽이다.
  - 반면 이 앱의 화면 컴포넌트는 관례상 전부 `observer`다(CLAUDE.md 상태 관리 패턴). `t()`가 observable을 읽는 것만으로 컴포넌트·모델 getter 양쪽이 하나의 반응성 경로로 갱신된다. react-i18next를 함께 쓰면 갱신 경로가 두 갈래(observer + useTranslation)로 갈라져 어느 쪽이 안 걸린 컴포넌트만 낡은 문구가 남는 버그 표면이 생긴다.
  - 루트 remount는 Expo Router 내비게이션 스택을 리셋한다 — 언어 화면에서 전환하는 순간 사용자가 초기 라우트로 튕긴다. 또 `makeAutoObservable`의 computed 캐시가 remount 후 suspension으로 비워지는 데 기대는 방식이라 보장이 간접적이다.
- **규칙: `t()`를 호출하는 컴포넌트는 `observer`여야 한다.** 문자열을 만드는 모델 getter는 그대로 두고(observer가 getter를 통해 observable을 읽으므로) 새로 추가되는 순수 View가 `t()`를 직접 쓸 때만 observer 래핑을 확인한다. 위반 검출은 L10N-11 스크립트에 포함한다(비-observer 파일에서 `t(` 호출 검출은 정밀하지 않으므로 리뷰 체크 항목으로도 둔다).
- 알럿·토스트는 `show()` 시점에 `t()`로 문자열을 만들어 넘기는 현행 구조를 유지한다 — 표시 중 언어가 바뀌는 경우는 수용하지 않는다(§6 엣지 케이스).
- 대안 비교(짧게): `react-intl`/`lingui`는 React 트리 밖(MobX 모델) 사용이 이류 시나리오라 배제. `i18n-js`(expo 예제 채택)는 가볍지만 복수형·후처리 생태계가 약해 i18next를 택한다. i18next는 React 밖 `i18next.t()`가 1급 API다.

### L10N-3 번역 리소스 구조와 키 규칙 `[제안]`

**수용 기준**

- 리소스는 `locales/ko.json` · `locales/en.json` · `locales/ja.json` 3개 파일. **ko.json이 단일 소스**다 — 키 추가·삭제·의미 변경은 ko.json에서 시작하고 en/ja가 따라간다.
- **네임스페이스는 분할하지 않는다**(언어당 1파일, i18next 기본 네임스페이스 하나). 전체 키가 수천 개 규모이고 어차피 전부 번들에 실리므로 lazy load 이득이 없다. 파일이 커져 관리가 힘들어지면 그때 도메인별 파일 분할 + 빌드 시 병합을 검토한다(분할해도 런타임 네임스페이스는 하나로 유지).
- 키 네이밍: **`<도메인>.<화면·기능>.<의미>`** 소문자 camelCase, 도메인 접두는 스펙 도메인과 정합시킨다 — `common.`(확인/취소/저장 등 공용), `warehouse.` `gearEdit.` `gearDetail.` `reply.` `bag.` `bagDetail.` `bagTemplate.` `packing.` `bagShare.` `bagDestination.` `search.` `feed.` `auth.` `info.` `campSite.` `weather.` `home.` `health.` `notification.` `app.`(초기화·OTA·탭). 예: `bag.delete.confirm`, `common.cancel`.
- 값의 의미가 "무엇"인지 키가 말하게 한다 — `bag.delete.confirm`(O), `bag.text1`(X). 같은 문구라도 맥락이 다르면 키를 분리한다(나중에 한쪽만 바뀔 수 있다).
- **번역 프로세스**: en/ja 초벌은 코디네이터(LLM)가 작성하고 **사용자가 검수 후 확정**한다. 미검수 상태로 릴리스하지 않는다.
- JSON에는 주석을 둘 수 없으므로, **문구에 근거가 있는 키**(예: 스토어 심사 지적으로 확정된 `계속` 류 문구, 법적 고지 문구)는 이 문서 §4의 "문구 근거 표"에 키↔근거로 기록하고 커밋 메시지에 연결한다.

### L10N-4 언어 전환 즉시 반영 `[제안]`

사용자가 언어를 바꾸면 앱 재시작 없이 모든 화면 문구가 즉시 바뀐다.

**수용 기준**

- 언어 설정 화면에서 선택을 바꾸면 → **재시작·remount 없이** 현재 화면과 뒤 스택의 화면, 탭 라벨(`창고`/`탐색`/`배낭`/`정보`), 이후 뜨는 알럿·토스트, 모델 getter가 돌려주는 라벨이 전부 새 언어로 표시된다.
- 내비게이션 스택은 유지된다 — 전환 후 뒤로가기가 원래 화면으로 동작한다.
- 전환 시점에 이미 화면에 떠 있는 알럿·토스트는 갱신하지 않아도 된다(§6).
- 시스템 따르기 상태에서 기기 언어를 바꾼 경우: 다음 앱 실행 시 반영되면 충분하다(iOS는 기기 언어 변경 시 앱을 종료시키므로 자연 충족. Android의 라이브 로캘 변경 이벤트 구독은 선택 사항).

### L10N-5 정보 탭 언어 설정 UI `[제안]`

**수용 기준**

- 정보 탭 메뉴 목록에 **`언어` 행**을 추가한다. 자리는 `알림 설정` 다음(설정 계열 묶음). 행 문법은 [Auth.md](Auth.md) AU-4의 목록 문법(헤어라인·chevron·44pt 터치 타깃)을 그대로 따르고, 행 우측에 **현재 적용 언어의 자기 표기**(`한국어`/`English`/`日本語`)를 `rowSubtitle` 톤으로 보여준다(저장값이 없어도 시스템에서 유도한 언어를 보여준다).
- 탭하면 `/info/language`로 이동. 화면 타이틀은 `언어`(현재 언어로 번역).
- 화면은 단일 선택 목록 **3행: `한국어` / `English` / `日本語`**. 선택된 행에 체크마크(SF Symbol `checkmark` ↔ Android/웹 대응 아이콘). 행 문법·헤어라인은 정보 탭 목록과 동일, 각 행 44pt 이상.
  - **`시스템 설정 따르기` 행은 두지 않는다**(2026-08-23 사용자 결정 — 시뮬레이터 확인 후). 시스템 따르기는 UI 항목이 아니라 **기본 상태**다: 저장값이 없는 동안 시스템 로캘에서 유도한 언어에 체크가 가고, 사용자가 행을 고르는 순간부터 그 선택이 저장된다. 한 번 고르면 시스템 따르기로 되돌아가는 경로는 없다 — 원하는 언어를 직접 고르면 되므로 되돌리기가 필요 없다는 판단.
- **언어 이름 3개는 번역하지 않는다** — 항상 자기 언어 표기(`한국어`·`English`·`日本語`)로 고정한다(어떤 언어 상태에서도 자기 언어를 찾을 수 있어야 한다).
- 행 선택 → 즉시 반영(L10N-4) + 저장(L10N-1). 확인 알럿을 거치지 않는다(즉시 결과가 보이고 같은 화면에서 바로 되돌릴 수 있는 액션이다).
- 비로그인에서도 접근·동작한다(언어는 계정이 아니라 기기 설정이다).

### L10N-6 일본어 폰트 전략 `[제안]`

★ 실측: **Pretendard(현재 번들, 4웨이트 각 약 2.7MB)에 CJK 한자 글리프가 없다** — 가나(あ·ア·ぱ·ヴ)는 있으나 한자(山·続)가 전무하다(fontTools cmap 실측, 매핑 14,336자). 일본어 문장은 한자가 섞이는 순간 글리프별로 시스템 폰트에 폴백돼 **한 문장 안에서 폰트가 갈라진다.** 텍스트는 전부 공용 `components/PretendardText.tsx`를 거치므로(raw Text 금지) 전환 지점은 한 곳이다.

**검토한 두 안**

- **(a) Pretendard JP 변형으로 번들 폰트 교체** (공식 변형 존재 — orioncactus/pretendard의 Pretendard JP):
  - 장점: 브랜드 타이포·자간·줄간 토큰(`AcgType`) 재보정 불필요(같은 패밀리 메트릭), weight 체계 그대로, 한 문장 내 폰트 갈라짐 원천 차단(가나+한자+라틴+한글을 한 폰트가 커버), `PretendardText` 수정 없이 폰트 파일 교체+로드 이름 유지로 끝.
  - 단점: 번들 증가 — 한자 글리프만큼 웨이트당 수 MB(4웨이트 합산 대략 +8MB 안팎 예상, **실측 필요**). OTA 번들 크기에도 영향.
- **(b) ja 로캘에서만 시스템 폰트 사용** (`PretendardText`가 로캘을 보고 fontFamily를 iOS Hiragino Sans / Android system 폰트로 전환):
  - 장점: 용량 증가 0.
  - 단점: ① **인앱 오버라이드 때문에 기기 로캘 ≠ 앱 언어 조합이 항상 생기는데**, 시스템 CJK 폰트는 Han unification 자형을 기기 로캘 기준으로 고른다 — 한국어 기기에서 앱만 ja로 쓰면 일본어 한자가 한국/중국식 자형으로 그려질 수 있다(특히 Android). ② weight ↔ 시스템 폰트 웨이트 매핑을 플랫폼별로 새로 정의·유지해야 한다. ③ ja 화면에서 브랜드 타이포가 사라지고, 한국어 콘텐츠(Firestore, 번역 안 함)가 섞인 화면에서 UI와 콘텐츠의 폰트 톤이 갈라진다.

**결정: (a) Pretendard JP 교체를 권고안으로 확정한다.** 인앱 오버라이드가 확정 전제(§1)인 이상 (b)의 자형 오류 리스크는 구조적이고, (a)의 비용은 용량뿐이라 완화(서브셋·지연 로드, §8)가 가능하다.

**수용 기준**

- 번들 폰트를 Pretendard JP 4웨이트(Regular/Medium/SemiBold/Bold)로 교체한다. `expo-font` 로드 이름(`Pretendard-*`)과 `PretendardText`의 weight 매핑은 유지한다.
- **교체 전 검증 게이트(구현 태스크에서 수행)**: ① Pretendard JP에 **한글 글리프가 완전 포함**되는지 cmap 실측(포함 안 되면 교체 불가 — 폴백 플랜으로 전환) ② 4웨이트 합산 증가 용량 실측·보고 ③ ko 화면 렌더가 기존과 시각적으로 동일한지 스크린샷 대조.
- 폴백 플랜(게이트 ① 실패 시): `PretendardText`가 로캘을 보고 KR/JP 패밀리를 갈아끼우는 (a')(두 패밀리 모두 번들, 용량 약 2배) 또는 (b)를 재검토 — 이때는 사용자 결정으로 되돌린다.
- 콘덴스드 수치(`AcgDisplayText`, Archivo Narrow)는 라틴 숫자 전용이라 로캘 무관 — 변경하지 않는다.
- 폰트 교체는 **네이티브 자산 변경이므로 스토어 빌드로 배포한다**(OTA로 폰트를 실어 보내는 것은 번들 급증 — 하지 않는다).

### L10N-7 보간·복수형·조사 규칙 `[제안]`

**수용 기준**

- 보간은 i18next 표준 `{{name}}` 문법. 문장을 조각으로 쪼개 코드에서 이어 붙이지 않는다 — 어순이 언어마다 다르므로 **문장 전체가 하나의 키**여야 한다.
- **한국어 조사**: 이미 의존 중인 `josa` 패키지를 재사용한다. ko 값에 조사 병기형(`{{name}}을(를) 담았어요`)을 쓰고, `L10n.t()`의 ko 전용 후처리(i18next postProcessor)가 보간된 이름의 받침에 맞춰 조사를 확정한다. en/ja에는 후처리를 적용하지 않는다. 현재 `josa`를 직접 호출하는 3개 파일(`model/bag-detail/BagDetail.ts`, `components/search/SearchInputView.tsx`, `components/warehouse/WarehouseScreen.tsx`)은 이관 시 이 경로로 통합한다.
- **복수형**: en만 단·복수 구분이 필요하다(i18next JSON v4 `_one`/`_other` 접미사 + `count` 파라미터). ko·ja는 `_other` 단일형으로 둔다. **주의: i18next v21+의 복수형은 `Intl.PluralRules`에 의존한다 — Hermes의 지원 여부를 구현 시 기기에서 확인**하고(`typeof Intl.PluralRules`), 미지원이면 `intl-pluralrules` 폴리필을 추가한다(en/ko/ja만 필요, 용량 소폭).
- 성별 분기·서수는 이 앱에 없다 — 도입하지 않는다.

### L10N-8 날짜·숫자 포맷 `[제안]`

실측: 날짜 포맷은 대부분 커스텀 한국어 조립(dayjs `format('M월 D일 HH:mm')` 등 — dayjs 사용 파일 20여 개)이고, `toLocale*`/`Intl` 직접 사용은 2개 파일(`components/warehouse-detail/WarehouseDetailDeclutterBannerView.tsx`, `WarehouseDetailActivityTotalsView.tsx`)뿐이다.

**수용 기준**

- **Intl로 통일하지 않고 이미 의존 중인 dayjs를 유지**한다. 근거: Hermes의 Intl 커버리지(API·로캘 데이터)가 버전·플랫폼별로 갈리는 리스크를 피하고, 기존 코드가 이미 dayjs 중심이다.
- dayjs 로캘(ko/en/ja)을 로드하고 `L10n.setLanguage()`가 `dayjs.locale()`을 함께 전환한다.
- 커스텀 조립 포맷(`M월 D일` 등)은 **포맷 문자열 자체를 번역 키로 이관**한다 — 예: `format.monthDay` = ko `M월 D일` / en `MMM D` / ja `M月D日`. 언어별로 어순·구성요소가 달라지므로 포맷도 번역의 일부다.
- `toLocale*` 직접 사용 2개 파일은 이관 단계에서 명시적 로캘 인자(현재 언어)를 넘기도록 정리한다. 숫자 자릿수 구분(1,234)은 ko/en/ja 모두 동일하므로 현행 유지.
- 무게 단위(g/kg)는 세 언어 공통 표기 — 번역하지 않는다.

### L10N-9 번역하지 않는 것 `[제안]`

**수용 기준** — 아래는 번역 대상에서 제외하며, L10N-11 검출 스크립트의 예외 목록과 일치시킨다:

- **Firestore 콘텐츠**(박지 설명·경고문, 추천 카드 제목·요약, 사용자 입력 데이터 전부) — 한국어 유지(§1 결정 2).
- **카테고리 캐논컬 값**(`침낭` 등 — Firestore 데이터 키, [DataModel.md](DataModel.md)) — 값 자체는 절대 번역·변경하지 않는다. en/ja UI에서의 카테고리 **표시명** 매핑은 콘텐츠 다국어화와 묶어 후속(§8).
- **로그·주석·console 메시지** — 개발자용, 한국어 유지.
- **`useless` 워드마크** — 라틴 고정.
- **공유 이미지 내보내기 캔버스**([BagShare.md](BagShare.md) 필름 카드) — **조사 결과 번역 불필요로 확정**: 캔버스 고정 라벨은 이미 영문(`ITEM`/`WEIGHT`/`TOTAL ITEMS`/`TOTAL WEIGHT`, Inter 폰트)이고 나머지는 사용자 데이터다. 단 캔버스 **주변 UI**(버튼 `사진 고르기`, 토스트 등)는 일반 UI 문구로 번역 대상이다.
- **`constants/LegalTexts.ts`의 약관·개인정보 처리방침 전문** — 법률 문서 번역은 법적 검토가 필요해 이 스펙 범위 밖(§8). 전문은 한국어를 유지하고, 전문으로 들어가는 행 라벨·안내 문구만 번역한다.
- **언어 이름 자기 표기**(`한국어`·`English`·`日本語`, L10N-5).

### L10N-10 도메인별 단계 이관 계획 `[제안]`

약 300개 파일을 한 번에 바꾸지 않는다. 단계마다 독립 태스크·독립 커밋으로 진행하고, **이관이 끝난 도메인만 L10N-11 검출 대상에 추가**한다. 이관 중 상태(일부 화면 ko 고정)는 허용한다 — en/ja 사용자에게는 미이관 화면이 한국어로 보인다.

| 단계 | 범위 (스펙 도메인) | 주요 디렉토리 | 완료 기준 |
| --- | --- | --- | --- |
| 0. 인프라 | L10N-1~8 구축, `common.*` 키, 정보 탭 언어 설정 | `model/l10n/`, `locales/`, `app/info/language.tsx` | ✅ 완료 — 언어 전환 동작 + 수용 기준 L10N-1/2/4/5 통과 |
| 1. 정보/설정 | Auth(정보 탭·로그인·탈퇴), Notification 설정 | `app/info/`, `app/(tabs)/info.tsx`, `components/info/`, `components/login/`, `components/notification/` | ✅ 완료 — 도메인 grep 0건 |
| 2. 배낭 | Bag, BagDetail, BagTemplate, Packing, BagDestination, BagShare(주변 UI) | `components/bag*`, `model/bag*` | ✅ 완료 — 도메인 grep 0건 |
| 3. 창고/장비 | Warehouse, GearEdit, GearDetail, Reply | `components/warehouse*`, `components/gear*`, `model/gear*`, `model/warehouse*`, `model/reply/` | ✅ 완료 — 도메인 grep 0건 |
| 4. 검색/탐색 | Search, Feed | `components/search/`, `components/feed/`, `model/search/`, `model/feed/` | ✅ 완료 — 도메인 grep 0건 |
| 5. 지도/박지 | CampSite, Weather | `components/camp-site/`, `model/camp-site/`, `model/weather/` | ✅ 완료 — 도메인 grep 0건 |
| 6. 홈 | Home, HealthActivity | `components/home/`, `model/home/`, `model/health/` | ✅ 완료 — 도메인 grep 0건 |
| 7. 공유·기타 | 전역 알럿·토스트 공통 문구, 탭 라벨, OTA·초기화 문구, 잔여 정리 | `model/alert/`, `model/toast/`, `app/_layout.tsx`, `app/(tabs)/_layout.tsx` 외 잔여 | ✅ 완료 — 인자 없는 전 저장소 스캔 0건(예외 목록 제외) |

- 각 단계의 검증: ① 해당 디렉토리 L10N-11 grep 0건 ② ko/en/ja 3개 언어로 해당 도메인 주요 화면 스크린샷 확인 ③ `npm run lint` + `npx tsc --noEmit` 통과.
- 단계 순서 근거: 인프라 다음에 **문구가 적고 언어 설정 자체가 사는 정보 탭**으로 패턴을 확립하고, 사용 빈도가 높은 배낭→창고→검색 순으로 넓힌다.

### L10N-11 하드코딩 리터럴 잔존 검출 `[제안]`

**수용 기준**

- 검출 스크립트 `scripts/find-hardcoded-korean.mjs`(신규)를 둔다: 대상 디렉토리의 `.ts`/`.tsx`에서 **주석 밖의 한글(`[가-힣]`) 리터럴**을 찾아 파일:라인으로 출력하고, 발견 시 exit 1.
- 예외(스캔 제외): `locales/`, `constants/LegalTexts.ts`, 주석, L10N-9의 비번역 항목이 사는 지점(카테고리 캐논컬 정의, console/로그 문자열은 라인 단위 예외 주석 `// l10n-ignore`로 표시).
- 스크립트는 **이관 완료 도메인 디렉토리 목록**을 인자로 받는다 — L10N-10 표의 완료 단계가 늘 때마다 목록에 추가하고, 전 단계 완료 후에는 저장소 전체(예외 제외)를 기본 대상으로 한다.
- lint 파이프라인 편입(예: `npm run lint` 뒤 후속 스크립트)은 전 단계 완료 시점에 한다 — 이관 중에는 수동/단계 검증용으로만 돌린다.

### L10N-12 네이티브·스토어 표면 로컬라이즈 `[제안]`

**수용 기준**

- **iOS 권한 문구**: 현재 `app.json` plugins에 한국어 하드코딩(expo-image-picker `photosPermission`·`cameraPermission`, expo-media-library, expo-location, healthkit `NSHealthShareUsageDescription`). expo의 `locales` 설정(`app.json` `"locales": { "ko": ..., "en": ..., "ja": ... }` → `InfoPlist.strings` 생성)으로 3개 언어를 제공한다. plugins의 문구는 기본값(개발 리전) 역할로 남는다.
  - **권한 시트는 OS 표면이라 기기 로캘을 따른다** — 인앱 언어 오버라이드와 무관하다. 이는 수용한다(권한 문구만 기기 언어로 나와도 심사·사용성 문제 없음).
  - `CFBundleLocalizations`에 3개 언어가 선언되면 iOS 설정 앱에 **앱별 언어** 항목이 생긴다 — 이 값은 시스템 로캘 입력의 하나로만 취급한다(인앱 설정이 항상 우선, L10N-1). expo-localization `getLocales()`가 앱별 언어를 반영하므로 추가 구현 불요.
- **`locales` 설정·InfoPlist.strings는 네이티브 빌드가 필요하다** — OTA로 배포할 수 없고, 폰트 교체(L10N-6)와 묶어 스토어 릴리스 빌드로 나간다.
- **Android**: 런타임 권한 다이얼로그는 OS 문구라 로컬라이즈 대상이 없다. 앱명 `useless`는 라틴 워드마크로 전 언어 동일 — `strings.xml` 로컬라이즈를 하지 않는다. Health Connect 권한 사유 문구 등 config plugin이 심는 문자열이 있는지 구현 시 `npx expo prebuild -p android --no-install` 산출물로 확인한다.
- **스토어 메타데이터**(App Store·Play 등록정보의 설명·스크린샷)는 앱 코드 밖 — 별도 트랙(§8).
- **웹 랜딩(Firebase Hosting의 별도 레포)은 범위 밖.** 단 이 저장소의 Expo 웹 빌드 자체는 플랫폼 분기(§5)대로 지원한다.

## 4. 데이터

- Firestore·Storage·Algolia에는 **아무 변경이 없다** — 번역 리소스는 전부 앱 번들(`locales/*.json`)에 산다. 콘텐츠는 한국어 유지(§1 결정 2).
- 로컬 저장: AsyncStorage 키 `appLanguage`(L10N-1). [AppLifecycle.md](AppLifecycle.md) APP-6에 등록.
- **문구 근거 표** (L10N-3 — JSON에 주석이 없으므로 여기 기록한다. 이관하며 채운다):

| 키 | 근거 |
| --- | --- |
| `auth.googleLogin` | Google 로그인 제공자 식별이 명확한 버튼 문구를 사용한다. en/ja도 `Sign in with Google`/`Googleでログイン`으로 유지한다. |
| `auth.appleLogin` | Apple 로그인 제공자 식별이 명확한 버튼 문구를 사용한다. 허용을 유도하는 표현 없이 `Sign in with Apple`/`Appleでログイン`으로 유지한다. |
| `auth.terms.submit` | 동의 완료 후 다음 단계로 이동하는 중립적 문구를 사용한다. en/ja도 `Agree and continue`/`同意して続行`으로 유지한다. |
| `common.continue` | 건강 권한 인트로(HA-2) 주 액션은 App Store 심사 5.1.1(iv) 지적에 따라 권한 허용을 유도하지 않는 중립어 `계속`을 사용한다. en/ja도 `Continue`/`続行`으로 유지하며, `accessibilityLabel`에도 동일 키를 쓴다. |
| `app.tabs.*` | 탭은 화면의 목적을 짧게 식별하는 명사형 라벨을 사용한다. iOS NativeTabs와 Android/Web Tabs 모두 같은 키를 읽고 observer로 감싸 언어 전환 즉시 갱신한다. |
| `app.update.*` | 강제 업데이트는 차단 상태와 사용자가 해야 할 주의를 짧고 명확하게 전달한다. OTA fallback은 L10n 초기화 전에도 표시될 수 있어 ko 리터럴을 안전 폴백으로 유지한다. |
| `app.announcement.*`·`app.featurePopup.*` | 전역 오버레이의 닫기·상세·보류 액션은 화면의 동작을 그대로 설명하는 접근성 라벨과 버튼 문구를 공유한다. |
| `app.bag*`·`app.template*` | 배낭·템플릿 폼의 검증, 성공·실패 피드백은 사용자가 다음 행동을 알 수 있도록 기존 공통 오류·확인 어휘와 결합한다. |
| `app.reviewWrite.*`·`app.gearAdd.*` | 후기 작성과 장비 추가는 입력 영역의 목적과 선택적 입력 여부를 명시해 언어별 어순을 번역 문장 단위로 보장한다. |
| `reply.errors.*` | 댓글 저장 계층에서 사용자에게 전달되는 검증 오류도 Alert에 원문으로 노출되지 않도록 번역 키를 사용한다. |

## 5. 플랫폼 분기

| 지점 | iOS | Android | Web |
| --- | --- | --- | --- |
| 시스템 로캘 소스 | expo-localization(앱별 언어 설정 반영) | expo-localization | `navigator.language` (expo-localization 웹 지원) |
| 권한 문구 | InfoPlist.strings(기기 로캘, L10N-12) | OS 제공 다이얼로그(대상 없음) | 해당 없음 |
| 폰트 | Pretendard JP 번들 교체(L10N-6) | 동일 | 동일(웹 폰트 로드 용량 영향 — 구현 시 확인) |
| 기기 언어 라이브 변경 | 앱 종료 후 재실행이라 자연 반영 | 다음 실행 시 반영이면 충분(L10N-4) | 새로고침 시 반영 |
| 배포 | 폰트·InfoPlist.strings는 스토어 빌드, 번역 JSON·코드는 OTA 가능 | 동일 | `npm run deploy` |

- OTA 주의: 번역 키를 쓰는 코드와 `locales/*.json`은 같은 JS 번들에 있으므로 키 불일치가 생기지 않는다. 단 **폰트 교체(네이티브 자산) 전 바이너리에 ja UI를 OTA로 먼저 내리면 한자가 폴백 폰트로 갈라진다** — ja 노출은 폰트가 실린 스토어 빌드 이후로 순서를 지킨다.

## 6. 엣지 케이스

- **비로그인**: 언어 설정은 로그인과 무관하게 동작(L10N-5). 로그인 모달·비로그인 화면 문구도 번역 대상.
- **미지원 로캘 기기**(예: fr): en으로 폴백(L10N-1). 언어 설정 화면에서는 `English` 행에 체크가 간다.
- **전환 순간 떠 있는 알럿·토스트**: 갱신하지 않는다 — 언어 설정 화면에서 전환하는 순간 다른 오버레이가 떠 있는 경우는 사실상 없고, 다음 표시부터 새 언어면 충분하다.
- **번역 키 누락**(en/ja): ko 값 폴백(L10N-1). dev 빌드에서 경고 로그.
- **AsyncStorage 읽기 실패**: `LocalStorageManager`가 null을 돌려주므로 시스템 따르기로 동작 — 크래시·빈 문구가 없어야 한다.
- **저장 값이 미지원 코드**(예: 과거 버전이 남긴 값): 무시하고 시스템 따르기로 폴백, 키 삭제.
- **미이관 화면**(L10N-10 진행 중): en/ja 사용자에게 한국어로 보인다 — 허용. 단 한 화면 안에서 이관·미이관 문구가 섞이지 않도록 이관은 화면(도메인) 단위로 완결한다.
- **긴 영어 문구 레이아웃**: ko 기준으로 잡힌 고정폭 버튼·행에서 en 문구가 넘칠 수 있다 — 말줄임 대신 줄바꿈·`minHeight` 원칙(Dynamic Type 규칙과 동일)을 따르고, 단계 검증 스크린샷에서 확인한다.
- **OTA fallback**: HotUpdater fallback은 `app.initialize()`와 i18next 초기화보다 먼저 렌더될 수 있다. 따라서 해당 두 상태 문구는 초기화 전에도 크래시 없이 표시되는 ko 리터럴로 유지하고, 각 리터럴에 `l10n-ignore` 근거를 남긴다. 초기화 완료 후 일반 앱 화면은 번역 키를 사용한다.

## 7. 수동 검증 체크리스트

- [ ] ko 기기 + 설정 없음 → 앱 전체 한국어, 첫 렌더부터(깜빡임 없음)
- [ ] en/ja/기타(fr 등) 기기 → 각각 en/ja/en으로 표시
- [ ] 정보 탭 `언어` 행 → 화면 진입 → `English` 선택 → **재시작 없이** 현재 화면·탭 라벨 즉시 전환, 뒤로가기 정상
- [ ] 전환 직후 알럿(예: 로그아웃 확인)·토스트가 새 언어로 표시 — 모델(AlertManager 경유) 문구 포함
- [ ] `日本語` 선택 → 한자 포함 문구(예: `続行`·`山` 류)가 **한 문장 안에서 폰트 갈라짐 없이** Pretendard JP로 렌더 (iOS/Android 스크린샷)
- [ ] ko 화면이 폰트 교체 후에도 기존과 동일하게 렌더(교체 전후 스크린샷 대조)
- [ ] 언어를 고른 적 없는 상태(키 없음) → 시스템 로캘 언어에 체크, 정보 탭 행 우측도 그 언어의 자기 표기
- [ ] 앱 종료 후 재실행 → 선택 언어 유지
- [ ] en에서 count 보간 문구의 단수/복수(1개/2개) 정상
- [ ] ko에서 조사 보간(`~을/를`) — 받침 유무 이름으로 각각 확인
- [ ] 날짜 문구가 언어별 포맷(`8월 23일` / `Aug 23` / `8月23日`)으로 표시
- [ ] en 긴 문구에서 버튼·행 레이아웃 넘침 없음 + Dynamic Type 최대 크기에서 확인
- [ ] 이관 완료 도메인에 `scripts/find-hardcoded-korean.mjs` 0건
- [ ] iOS 권한 시트 문구가 기기 로캘(ko/en/ja)로 표시(스토어 빌드에서)
- [ ] 웹 빌드에서 언어 결정·전환 동작
- [ ] ko/en/ja 각각 주요 화면(홈·창고·배낭 상세·검색·정보) 스크린샷 확인

## 8. 미해결 질문

- **콘텐츠 다국어화(후속 단계)**: Firestore 콘텐츠(박지 설명·경고문, 추천 카드 제목·요약)와 카테고리 **표시명** 매핑의 다국어화. 데이터 모델 확장(필드 접미 `_en`/`_ja` 또는 별도 문서)·번역 운영 비용이 커서 이 스펙 범위 밖 — UI 문구 이관 완료 후 별도 스펙으로.
- **약관·개인정보 처리방침 전문**(`constants/LegalTexts.ts`): 법률 문서 번역은 법적 효력 검토가 필요하다. "한국어 원문이 우선한다" 고지와 함께 영문 참고 번역을 둘지, 한국어 전문만 유지할지 — 사용자·법무 판단 필요.
- **스토어 메타데이터**: App Store·Play 등록정보(설명·키워드·스크린샷)의 en/ja 추가는 앱 코드 밖 별도 트랙. 스토어 노출 지역 확장 여부와 함께 결정.
- **폰트 용량 완화**: Pretendard JP 실측 용량이 부담이면 JIS 제1·2수준 서브셋 제작 또는 ja 선택 시 지연 다운로드(expo-font 런타임 로드)를 검토. 서브셋은 유지보수 비용이 있어 실측 후 판단.
- **Hermes `Intl.PluralRules` 지원 여부**(L10N-7): RN 0.86 Hermes 기기 실측 후 폴리필 필요성 확정.
- **웹 폰트 용량**(L10N-6): Expo 웹 빌드에서 Pretendard JP 4웨이트 로드가 초기 로딩에 주는 영향 — 웹만 서브셋/`font-display` 조정이 필요한지.
- **`t()` 호출 컴포넌트의 observer 보장**(L10N-2): grep 수준 검출의 한계 — ESLint 커스텀 룰로 강제할 가치가 있는지 이관 1~2단계 경험 후 판단.
