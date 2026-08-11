# iOS 리퀴드 글래스 내비게이션 전환

| 항목 | 내용 |
| --- | --- |
| 상태 | proposed `[기획]` · **2026-08-11 개정(as-built)**: LG-3 창고 검색 헤더를 실제 구현에 맞게 정정 — iOS 네이티브 바 타이틀 비움(본문 제목 블록이 화면 대상), 커스텀 타이틀 행 서술 `[이력]` 강등, Android·Web은 유리 크롬 + 유리 검색 필드, 콘텐츠 인셋은 수동 paddingTop · **2026-08-11 추가 정정(as-built)**: 그룹 A 중 Liquid Depth로 이식된 네 화면(browse·brand-directory·shared-bag·reply)도 바 타이틀을 비우고 Android·Web을 유리 크롬으로 그린다(LG-2) |
| ID 프리픽스 | `LG` |
| 추가 | **2026-08-11 (as-built)**: 탭바 절(LG-4) 추가 — 활성 색 `limeInk`, 배낭 탭 `backpack.fill`, 정보 탭 라벨 `내 정보` |
| 주요 코드 | `app/_layout.tsx`(Stack 옵션), 각 푸시 화면 컴포넌트(커스텀 헤더 제거), `app/(tabs)/_layout.tsx`(기존 NativeTabs), `components/warehouse/WarehouseScreen.tsx`·`WarehouseChromeView.tsx`·`WarehouseSearchFieldView.tsx`(LG-3) |
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
- Android·Web은 커스텀 JS 헤더를 렌더한다(화면 컴포넌트에서 `Platform.OS !== 'ios'`일 때만). Liquid Depth로 이식한 화면은 그 커스텀 헤더를 **유리 크롬 프리미티브**로 그려 iOS 시스템 바 버튼과 같은 그림을 맞춘다(창고는 LG-3, 배낭 상세·패킹 헤더도 같은 문법).
- HIG: 우측 바 버튼은 화면당 최대 2개, 아이콘 전용이면 `accessibilityLabel` 유지.

## 3. 전환 대상 (LG-2)

푸시 화면 19곳. 그룹별 진행:

**A. 단순(back + 타이틀)** — browse, brand-directory, popular-ranking, shared-bag/[id], reply/[id], reply/[id]/[commentId], info/notification, bag/[id]/weather

- **[정정] 2026-08-11 (as-built)** — Liquid Depth로 이식한 화면은 **바 타이틀을 비운다**(`headerTitle: ''`): browse(카테고리·브랜드 이름)·brand-directory(`브랜드별 탐색`)·shared-bag/[id](배낭 이름)·reply/[id](`리뷰`)의 화면 대상은 본문 **제목 블록**(32/38)이 들고, 같은 말을 바에 또 두면 중복이다 — 창고(LG-3)·배낭 상세와 같은 처리다. 예외는 `reply/[id]/[commentId]`로, 본문 제목 블록 없이 원 리뷰 카드로 바로 시작하므로 바 타이틀을 남긴다 — 값은 `답글`이다(2026-08-11 카피 통일, 옛 `댓글`).
- 같은 화면들의 **Android·Web 헤더도 커스텀 JS 헤더가 아니라 유리 크롬**이다(`LiquidGlassCircleButton` 원형 back). 정렬처럼 우측에 있던 컨트롤은 제목 블록 줄로 옮겨 두 플랫폼이 같은 자리를 쓴다([Search.md](Search.md) SR-7).
- 제목 블록·검색 필드가 상단에 고정되는 화면(browse·brand-directory·reply)은 `contentInsetAdjustmentBehavior='never'` + 수동 `paddingTop`(세이프에어리어 + 44 + 6)이다 — 창고와 같은 as-built 이탈이다.
**B. 우측 액션** — bag/[id](복사·공유), gear-detail/[id](공유·수정, **파일럿**), gear-edit/[id](삭제), bag/[id]/memo(완료), reply/…/edit(완료), bag/[id]/activity(다시 선택), useless/[id], ~~custom(닫기/back 분기)~~ — **custom은 전환 대상에서 제외**(2026-07-31, GearEdit GE-8): pageSheet 모달이라 형제 화면인 검색 모달과 같은 [핸들바 + 우상단 닫기] JS 헤더를 전 플랫폼 공통으로 쓴다
**C. 특수** — bag/[id]/edit(무게 카운트업 타이틀 → `headerTitle` 커스텀 컴포넌트로 이식), bag/[id]/packing(진행률 블록은 본문 유지, 내비 행만 네이티브로)

**수용 기준**

- 전환 화면에서 iOS는 커스텀 헤더 행(JS)이 렌더되지 않고 네이티브 헤더만 보인다.
- 기존 우측 액션·타이틀 동작(공유·수정·완료 등)이 동일하게 동작한다.
- **[정정] 2026-08-11 (as-built) — gear-detail**: Liquid Depth 이식과 함께 iOS `headerTitle`이 **상시 표시에서 스크롤 노출로** 바뀌었다. 본문 이름(28/36)이 화면 대상이라 최상단에서는 바를 비우고, 정체 블록을 지나면 제품명을 채운다([GearDetail.md](GearDetail.md) GD-1) — 배낭 상세·창고가 바 타이틀을 비운 것과 같은 이유이며, 여기만 스크롤 상태로 다시 채운다. Android·Web은 커스텀 JS 헤더가 아니라 **유리 크롬**(공용 `LiquidHeaderChrome`: 유리 원형 back + 유리 캡슐 `[공유][수정]`, 가운데 스크롤 노출 타이틀)으로 같은 그림을 그린다.
- 스크롤 시 콘텐츠가 헤더 뒤로 흐르고(scroll edge effect), 첫 콘텐츠가 헤더에 가리지 않는다.
- 커스텀 back의 부수 동작(예: 확인 얼럿)이 있으면 동등하게 이관한다.

## 4. 검색 헤더 내장 (LG-3)

### 범위와 구조

- 대상은 **창고 화면의 장비 검색**이다(창고는 탭 루트가 아니라 푸시 화면이다 — Home.md HM-0). 탐색 탭의 검색 바와 지도 오버레이 검색은 대상이 아니다.
- **[정정] 창고는 네이티브 검색을 쓴다**(2026-07-31). 창고가 탭 루트에서 **푸시 화면**으로 내려가며(Home.md HM-0) large title이 없어져, 아래 기각 사유의 전제가 사라졌다.
  - iOS 설정: `headerSearchBarOptions` + `placement: 'integratedButton'` — 비활성 상태는 **바 버튼**, 탭하면 필드로 펼쳐진다.
  - **`allowToolbarIntegration: false`가 핵심이다.** 기본값(`true`)이면 iPhone에서 검색이 **하단 툴바 가운데**로 내려간다(iOS 26 동작). 꺼야 상단 바에 남는다. 하단 우측 같은 임의 위치는 UIKit이 허용하지 않는다 — 선택지는 *하단 가운데* 아니면 *상단*뿐이다.
  - **`hideNavigationBar: false`** 도 함께 준다. iOS 26은 이 값을 문맥으로 정하는데, 감추는 쪽으로 판단되면 검색을 펼칠 때 **좌측 뒤로가기가 잠깐 가려졌다 사라진다**. 뒤로가기는 검색 중에도 살아 있어야 한다.
  - 바 버튼 배치는 `[검색][+ 장비 추가]`. Android·Web은 유리 캡슐 안에 **같은 순서·같은 자리**로 둔다.
- **iOS 네이티브 바 타이틀은 비운다**(`headerTitle: ''`, 2026-08-11 as-built). 화면 대상은 본문 **제목 블록**(`창고` 32/38 + 규모 줄 + 정렬)이 들고([Warehouse.md](Warehouse.md) WH-1), 같은 말을 바에 또 두면 중복이다 — 배낭 상세와 같은 처리다. 바에는 시스템 back(좌) + 검색·`+`(우)만 남는다.
- **Android·Web은 커스텀 JS 헤더가 아니라 유리 크롬이다**(2026-08-11 as-built): `LiquidGlassCircleButton`(back) + `LiquidGlassCapsule` 안 아이콘 두 개(`[검색][+]`)로 iOS 시스템 바 버튼과 같은 그림을 직접 그린다(`WarehouseChromeView`). 검색을 탭하면 **제목 블록 자리**가 유리 검색 필드 + `취소` 행으로 맞교환된다(`WarehouseSearchFieldView`, WH-8) — 크롬은 검색 중에도 그대로 남아 뒤로가기가 살아 있다.
  - 캡슐 안 아이콘 칸은 34×38이다. 겉면이 알약으로 클리핑해(`overflow: 'hidden'`) 그 밖의 히트 영역이 전달되지 않는 **현 프리미티브 구조상의 제약**이며, 시스템 바 버튼과 같은 크기다.
  - **크롬 얼개는 화면마다 만들지 않는다**(2026-08-11 공용화): 헤더 행(좌우 12 / 아래 8 / 투명) + 유리 원형 back + 우측 유리 캡슐(내부 여백 5 · gap 2) + 가운데 절대 배치 타이틀을 `components/liquid/LiquidHeaderChrome.tsx` 하나가 그리고, 배낭 상세·패킹 모드·창고·장비 상세가 그것을 쓴다(아이콘 칸 한 변은 `LIQUID_HEADER_ICON_BOX`). 화면 고유 요소만 슬롯으로 넘긴다 — 창고의 `[검색][+]`, 패킹의 텍스트 알약(`처음부터 다시`), 장비 상세의 `[공유][수정]`·스크롤 노출 타이틀. 그전에는 같은 구조가 네 파일에 문자 단위로 복제돼 있었다.
- **[이력] 탭 루트 시절 결정(실측 3회)**: 커스텀 타이틀 행. 요구 조건 — ① 타이틀 위 여백 최소 ② 검색은 버튼으로 두고 탭 시에만 필드 노출 ③ 타이틀·버튼 같은 행 — 을 동시에 만족하는 네이티브 API가 없었다:
  - `integratedButton`: 바 버튼이 컴팩트 행·large title이 아래 행이라 같은 행 불가 + 닫힘 시 필드가 중간 크기로 줄었다 사라지는 애니메이션 결함. **large title이 없어진 지금은 해당 없다.**
  - `stacked`(설정 앱 문법): 필드가 **상시 노출**되고 타이틀 위 예약 공간이 커서 기각.
- **[이력] 2026-07-31**: iOS는 중첩 Stack 헤더를 숨긴 채 **커스텀 타이틀 행**(좌측 `창고` 32pt + 같은 행 우측 원형 검색 버튼 44pt, 탭 시 [검색 필드 + `취소`]로 전환)을 그리고, Android·Web도 같은 행을 공유했다. 네이티브 검색(`integratedButton`)으로 옮기면서 iOS의 커스텀 행은 사라졌고, 타이틀은 바가 아니라 본문 제목 블록으로 내려갔다.

### 검색 동작

- 네이티브 검색 헤더 placeholder는 `장비 검색`이다. **취소 컨트롤의 글자는 지정하지 않는다** — iOS 26부터 취소 버튼이 글자 없는 X 아이콘으로 바뀌어 `cancelButtonText`가 무시된다(react-native-screens에서도 deprecated). Android·Web 유리 검색 필드는 글자 `취소`를 그대로 쓴다.
- `onChangeText`의 입력값을 기존 `Warehouse.setQuery()`에 연결해 필터링·빈 상태·검색 결과 동작을 유지한다.
- 검색 열기·닫기와 검색어 지우기는 기존 동작과 동일하게 처리한다. 닫을 때 검색어를 초기화한다.
- 장비가 하나도 없는 상태에서는 기존과 동일하게 검색 진입점을 노출하지 않는다.
- iOS에서 검색 활성화 시 커스텀 검색 행이 중복 렌더링되지 않아야 한다.

### 레이아웃과 플랫폼

- 네이티브 헤더는 `headerTransparent: true`를 사용하고, 검색 헤더에 별도 배경·블러를 지정하지 않는다.
- **창고의 상단 인셋은 수동 `paddingTop`이다**(2026-08-11 as-built): `insets.top + navBar(44) + 6`을 제목 블록 컨테이너에 직접 주고, 세이프에어리어는 `Layout`의 top edge를 빼서(`edges={['left','right','bottom']}`) 이중 인셋을 막는다.
  - automatic content inset(LG-1)은 **스크롤 뷰 루트가 헤더 밑까지 흐르는 화면**의 방법이다. 창고는 제목 블록·칩 줄이 **고정**이고 그 아래 목록만 스크롤하는 구조라(§고정 상단 블록은 [Warehouse.md](Warehouse.md) §2 화면 문법) 스크롤 뷰에 인셋을 걸 자리가 없다 — 고정 블록이 직접 헤더 높이를 비운다.
  - 대신 이 화면에서는 콘텐츠가 유리 크롬 **아래로 흐르지 않는다**. 유리를 통해 콘텐츠가 비쳐 보이는 다른 화면과 다른 as-built다.
- Android·Web에서 검색 토글, 검색어 초기화, 취소 버튼, 검색 결과 표시가 회귀하지 않아야 한다. 제목 블록 ↔ 검색 행은 **같은 최소 높이 상수**를 참조해 맞교환되므로 아래 칩 줄·목록이 밀리지 않는다(WH-2-1).

### 수용 기준

- iOS 창고에서 커스텀 검색 버튼 대신 네이티브 헤더 검색 버튼이 보인다.
- **iOS 네이티브 바에 `창고` 타이틀이 없다** — 화면 대상은 본문 제목 블록 하나뿐이고 같은 말이 두 곳에 있지 않다.
- 검색 버튼을 누르면 시스템 검색 필드와 취소 컨트롤이 나타나고, 입력에 따라 장비 목록이 즉시 필터링된다. 검색을 펼쳐도 좌측 뒤로가기가 사라지지 않는다.
- 검색어 지우기·취소·화면 이탈 후 검색어가 기존 정책대로 초기화된다.
- 장비가 없을 때 검색 진입점이 보이지 않는다.
- 제목 블록·첫 필터·첫 장비가 네이티브 헤더에 가리지 않는다(수동 `paddingTop`이 헤더 높이를 비운다).
- 탐색 탭과 지도 오버레이 검색 UI는 변경하지 않는다.
- Android·Web은 유리 크롬의 검색 버튼 → 유리 검색 필드로 같은 동작을 제공하고, 검색 중에도 뒤로가기가 남는다.

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
- [ ] gear-detail iOS: 최상단에서 바 타이틀이 비어 있고, 스크롤로 정체 블록을 지나면 제품명이 채워진다 (2026-08-11)
- [ ] ~~Android: 기존 커스텀 헤더 그대로(회귀 없음)~~ → Liquid Depth 이식 화면(창고·배낭 상세·패킹·장비 상세)은 Android·Web도 **유리 크롬**으로 바뀌었다. 나머지 미이식 화면은 기존 커스텀 헤더 그대로여야 한다.

### LG-3 창고 검색 헤더

- [ ] iOS 창고: 네이티브 헤더에 검색 버튼과 `+`가 보이고 **바 타이틀은 비어 있다**(`창고`는 본문 제목 블록에만)
- [ ] iOS 창고: 검색 버튼 탭 시 `장비 검색` 필드가 상단 바에서 펼쳐지고(하단 툴바로 내려가지 않음) 뒤로가기가 사라지지 않음
- [ ] iOS 창고: 입력·지우기·취소가 기존 `Warehouse` 검색 상태와 연결
- [ ] iOS 창고: 장비가 없을 때 검색 진입점 숨김
- [ ] iOS 창고: 제목 블록·필터·첫 장비가 헤더에 가리지 않음
- [ ] iOS: 탐색 탭·지도 오버레이 검색이 변경되지 않음
- [ ] Android/Web: 유리 크롬 `[검색][+]` → 제목 블록 자리에 유리 검색 필드 + `취소`가 맞교환되고 아래 칩 줄·목록이 밀리지 않음. 검색 중에도 뒤로가기가 남음

## 7. 탭바 (LG-4) — as-built 2026-08-11

탭바는 이 스펙의 나머지(상단 내비)와 달리 **처음부터 네이티브**다(iOS `NativeTabs`, Android·Web은 react-navigation JS 탭바). 아이콘도 탭바만 **SF Symbols를 유지**한다 — 목업의 Ionicons 탭 아이콘은 웹 대체품이다(핸드오프 웹→RN 변환 규칙). 2026-08-11 디자인 리뷰로 아래 셋을 고쳤다.

- **활성 색은 `limeInk`(#5C7A12)** 다. 잉크(#101012)와 비활성 회색(#8A8A94)은 명도만 다른 같은 계열이라, 유리 캡슐 안에서 어느 탭이 켜졌는지 한눈에 갈리지 않았다 — 색상까지 다른 라임 계열로 올려 캡슐 말고도 신호를 하나 더 준다. `tintColor`·`iconColor.selected`·`labelStyle.selected`에 같은 값을 주고, Android·Web JS 탭바의 `tabBarActiveTintColor`도 같다.
  - 목업의 **`잉크 캡슐 + 라임 아이콘`**(`Liquid.tabActiveBg`·`tabActiveIcon`)은 직접 그리는 웹 탭바의 값이고 **네이티브 UITabBar에는 옮길 수 없다** — iOS 26의 선택 캡슐은 시스템이 그려 채움색을 지정하는 API가 없다. 밝은 유리 면 위 라임 계열 글자·아이콘은 `limeInk`가 정본이다(라임 원색은 글자색으로 쓰지 않는다).
- **배낭 탭 아이콘은 `backpack.fill`** 이다(옛 `figure.hiking`). 걷는 사람은 활동을 말해 배낭·창고·여행지 어디로든 읽혔고, 이 탭이 여는 것은 배낭 목록이다. `backpack.fill`은 SF Symbols 2022(iOS 16.0)라 이 앱의 최소 버전(16.4)에서 안전하다. Android·Web은 `IconSymbol`의 Material 짝(`backpack`)을 쓴다.
- **정보 탭 라벨은 `내 정보`** 다(옛 `정보`). 앱이 사용자를 '나'로 부르는 카피 규칙(`내 창고`·`내 기록`)이고, 도착 화면의 제목 블록과 같은 말이다([Auth.md](Auth.md) AU-4).

**수동 검증**

- [ ] iOS 26: 탭을 옮기면 활성 아이콘·라벨이 라임 계열(`limeInk`)로 바뀌어 비활성과 한눈에 갈린다
- [ ] iOS: 배낭 탭 아이콘이 배낭 모양으로 나온다(빈 칸이 아니다 — 심볼 미지원이면 아이콘이 사라진다)
- [ ] Android/Web: 배낭 탭 아이콘이 Material `backpack`이고 활성 색이 iOS와 같다
- [ ] 다섯 탭 라벨이 `홈 / 탐색 / 지도 / 배낭 / 내 정보`다
