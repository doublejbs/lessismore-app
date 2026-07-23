# iOS 리퀴드 글래스 내비게이션 전환

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed `[기획]` |
| ID 프리픽스 | `LG` |
| 주요 코드 | `app/_layout.tsx`(Stack 옵션), 각 푸시 화면 컴포넌트(커스텀 헤더 제거), `app/(tabs)/_layout.tsx`(기존 NativeTabs) |
| 관련 스펙 | [GearDetail.md](GearDetail.md), [BagDetail.md](BagDetail.md), [Warehouse.md](Warehouse.md), [Search.md](Search.md) |

## 1. 개요

iOS 26 리퀴드 글래스는 **시스템 네이티브 컴포넌트를 쓰면 무료로 얻는다**(Xcode 26 빌드 시 자동). 탭 바(NativeTabs)·시트(formSheet)는 이미 네이티브라 적용돼 있으나, **상단 내비게이션(뒤로가기·타이틀·상단 버튼)은 전 화면이 `headerShown: false` + 커스텀 JS 헤더**라 글래스가 아니다.

이 스펙은 iOS에서 커스텀 JS 헤더를 **네이티브 스택 헤더(UINavigationBar)** 로 전환해 원형 글래스 back 버튼·바 버튼·scroll edge effect를 시스템에서 얻는 마이그레이션을 정의한다.

**결정 사항(사용자 확정)**

- **iOS만 전환** — Android·Web은 기존 커스텀 JS 헤더 유지(`Platform.OS === 'ios'` 분기).
- **시스템 폰트** — 네이티브 타이틀은 시스템 기본(SF/애플 시스템). `headerTitleStyle` 폰트 강제하지 않음.
- **일반 타이틀** — large title 미사용(RNS large title 겹침 버그 회피, 후속 도입 가능).
- **검색은 헤더 내장만** — `headerSearchBarOptions`(UISearchController). NativeTabs `role="search"` 분리형 검색 탭은 범위 밖.

## 2. 표준 패턴 (LG-1)

iOS 네이티브 헤더 화면의 공통 구성:

```tsx
// app/_layout.tsx (또는 중첩 레이아웃)의 Stack.Screen options — iOS만
{
  headerShown: Platform.OS === 'ios',
  headerTransparent: true,          // 글래스 룩 = 투명 + 시스템 scroll edge effect
  headerTitle: '…',                 // 시스템 폰트, 일반 타이틀
  headerBackButtonDisplayMode: 'minimal',  // 원형 글래스 chevron만(백 타이틀 없음)
  headerRight: () => <…/>,          // 우측 액션(필요 화면만)
}
```

**수용 기준**

- `headerBlurEffect`·`headerStyle.backgroundColor`를 지정하지 않는다 — 시스템 글래스/scroll edge effect에 위임(직접 지정 시 이중 블러 또는 불투명 플랫 배경으로 글래스가 깨짐).
- back 버튼은 시스템 자동(원형 글래스 chevron). 커스텀 back 아이콘을 그리지 않는다. 스와이프 back 제스처 유지.
- 콘텐츠는 **edge-to-edge**: 화면 루트 스크롤 뷰에 `contentInsetAdjustmentBehavior='automatic'`(iOS)을 주고, 수동 top 세이프에어리어 패딩(Layout top edge)을 iOS에서 제거해 이중 인셋을 없앤다.
- 스크롤 뷰가 아닌 고정 레이아웃 화면은 RNS `scrollEdgeEffects` 또는 콘텐츠 배치로 헤더 밑 가독성을 확보한다.
- Android·Web은 기존 커스텀 JS 헤더를 그대로 렌더(화면 컴포넌트에서 `Platform.OS !== 'ios'`일 때만 커스텀 헤더 렌더).
- HIG: 우측 바 버튼은 화면당 최대 2개, 아이콘 전용이면 `accessibilityLabel` 유지.

## 3. 전환 대상 (LG-2)

푸시 화면 19곳. 그룹별 진행:

**A. 단순(back + 타이틀)** — browse, brand-directory, popular-ranking, shared-bag/[id], reply/[id], reply/[id]/[commentId], info/notification, bag/[id]/weather
**B. 우측 액션** — bag/[id](복사·공유), gear-detail/[id](공유·수정, **파일럿**), gear-edit/[id](삭제), bag/[id]/memo(완료), reply/…/edit(완료), bag/[id]/activity(다시 선택), useless/[id], custom(닫기/back 분기)
**C. 특수** — bag/[id]/edit(무게 카운트업 타이틀 → `headerTitle` 커스텀 컴포넌트로 이식), bag/[id]/packing(진행률 블록은 본문 유지, 내비 행만 네이티브로)

**수용 기준**

- 전환 화면에서 iOS는 커스텀 헤더 행(JS)이 렌더되지 않고 네이티브 헤더만 보인다.
- 기존 우측 액션·타이틀 동작(공유·수정·완료 등)이 동일하게 동작한다.
- 스크롤 시 콘텐츠가 헤더 뒤로 흐르고(scroll edge effect), 첫 콘텐츠가 헤더에 가리지 않는다.
- 커스텀 back의 부수 동작(예: 확인 얼럿)이 있으면 동등하게 이관한다.

## 4. 검색 헤더 내장 (LG-3)

### 범위와 구조

- 대상은 **창고 탭의 장비 검색**이다. 탐색 탭의 검색 바와 지도 오버레이 검색은 대상이 아니다.
- iOS 창고 탭 루트에 중첩 Native Stack을 구성해 `headerSearchBarOptions`를 적용한다. NativeTabs 자체에는 Stack 헤더 옵션을 직접 적용하지 않는다.
- iOS 창고 화면의 커스텀 로고·검색 토글 행은 제거하고, 네이티브 헤더의 시스템 타이틀 `창고`와 검색 버튼을 사용한다.
- Android·Web은 중첩 Stack의 헤더를 숨기고 기존 로고·검색 토글 행을 그대로 유지한다.

### 검색 동작

- 네이티브 검색 헤더 placeholder는 `장비 검색`, 취소 버튼은 `취소`로 표시한다.
- `onChangeText`의 입력값을 기존 `Warehouse.setQuery()`에 연결해 필터링·빈 상태·검색 결과 동작을 유지한다.
- 검색 열기·닫기와 검색어 지우기는 기존 동작과 동일하게 처리한다. 닫을 때 검색어를 초기화한다.
- 장비가 하나도 없는 상태에서는 기존과 동일하게 검색 진입점을 노출하지 않는다.
- iOS에서 검색 활성화 시 커스텀 검색 행이 중복 렌더링되지 않아야 한다.

### 레이아웃과 플랫폼

- 네이티브 헤더는 `headerTransparent: true`를 사용하고, 검색 헤더에 별도 배경·블러를 지정하지 않는다.
- 창고 목록과 필터는 네이티브 헤더 아래에서 첫 항목이 가려지지 않도록 automatic content inset을 사용한다. 수동 top safe-area padding을 중복 적용하지 않는다.
- Android·Web에서 기존 검색 토글, 검색어 초기화, 취소 버튼, 검색 결과 표시가 회귀하지 않아야 한다.

### 수용 기준

- iOS 창고 탭에서 로고 우측 커스텀 검색 버튼 대신 네이티브 헤더 검색 버튼이 보인다.
- 검색 버튼을 누르면 시스템 검색 필드와 `취소`가 나타나고, 입력에 따라 장비 목록이 즉시 필터링된다.
- 검색어 지우기·취소·탭 전환 후 검색어가 기존 정책대로 초기화된다.
- 장비가 없을 때 검색 진입점이 보이지 않는다.
- 첫 필터·첫 장비가 네이티브 헤더에 가리지 않는다.
- 탐색 탭과 지도 오버레이 검색 UI는 변경하지 않는다.
- Android·Web은 기존 창고 검색 UI와 동작을 유지한다.

## 5. 엣지 케이스 / 리스크

- **RNS 헤더 글래스 머티리얼 배경 미지원**(software-mansion/react-native-screens#4021): `headerTransparent`+시스템 scroll edge effect로 대응. 바 버튼·back은 글래스로 렌더됨.
- **large title 겹침 버그**(#3315): large title 미사용으로 회피.
- 모달/formSheet 라우트는 대상 아님(이미 네이티브 시트, 그래버가 닫기 어포던스).
- RN Modal 커스텀 시트(공지·팝업·필터·알럿)는 콘텐츠 레이어 — 글래스 대상 아님(HIG: 글래스는 내비 레이어 전용).
- Android 회귀 금지: 전환 화면의 Android 렌더 결과가 기존과 동일해야 한다.

## 6. 수동 검증 체크리스트 (파일럿 기준)

- [ ] gear-detail iOS: 네이티브 글래스 back(원형) + 우측 공유·수정, 커스텀 헤더 행 없음
- [ ] 스크롤 시 콘텐츠가 헤더 뒤로 흐르고 scroll edge effect 동작
- [ ] 첫 콘텐츠가 헤더에 가리지 않음(이중 인셋 없음)
- [ ] back 탭·스와이프 back 모두 동작
- [ ] 공유·수정 액션 기존과 동일
- [ ] Android: 기존 커스텀 헤더 그대로(회귀 없음)

### LG-3 창고 검색 헤더

- [ ] iOS 창고: 네이티브 헤더에 `창고` 타이틀과 검색 버튼 표시
- [ ] iOS 창고: 검색 버튼 탭 시 `장비 검색` 필드와 `취소` 표시
- [ ] iOS 창고: 입력·지우기·취소가 기존 `Warehouse` 검색 상태와 연결
- [ ] iOS 창고: 장비가 없을 때 검색 진입점 숨김
- [ ] iOS 창고: 필터와 첫 장비가 헤더에 가리지 않음
- [ ] iOS: 탐색 탭·지도 오버레이 검색이 변경되지 않음
- [ ] Android/Web: 기존 창고 검색 토글 UI와 동작 유지
