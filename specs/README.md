# 스펙 문서 (specs/)

이 디렉토리는 **useless 앱의 동작 명세 단일 소스(single source of truth)** 다.
모든 기능 추가·변경·버그 수정은 코드보다 **스펙을 먼저** 고친다.

- 각 스펙은 현재 코드의 실제 동작(as-built)을 기준으로 작성되었다 (최초 작성: 2026-06-10).
- 스펙과 코드가 다르면 → 스펙이 의도라면 코드를 고치고, 코드가 맞다면 스펙을 갱신한다. 어느 쪽인지 모호하면 사용자에게 확인한다.

## 스펙 인덱스

| 스펙 | ID 프리픽스 | 범위 |
| --- | --- | --- |
| [Warehouse.md](Warehouse.md) | `WH` | 창고 탭 — 장비 목록 / 정렬 / 필터 / 삭제 |
| [GearEdit.md](GearEdit.md) | `GE` | 장비 추가(커스텀) / 편집 |
| [GearDetail.md](GearDetail.md) | `GD` | 장비 상세 — 정보 / 배낭 기록 / 리뷰·외부 후기 |
| [Reply.md](Reply.md) | `RP` | 장비 리뷰 — 댓글 / 답글 / 좋아요 |
| [Bag.md](Bag.md) | `BAG` | 배낭 탭 — 목록 / 생성 / 삭제 |
| [BagDetail.md](BagDetail.md) | `BD` | 배낭 상세 / 편집 / 메모 / 사용 여부 기록 / 링크 공유 |
| [BagDestination.md](BagDestination.md) | `DST` | 배낭 여행지 — 위치 선택 / 박지 연결 / 날씨 연계 |
| [Packing.md](Packing.md) | `PK` | 패킹 모드 — 출발 전 짐 싸기 체크 |
| [BagShare.md](BagShare.md) | `BS` | 배낭 필름 카드 공유 — 사진 위에 무게·거리·속도·날짜를 얹은 SNS 이미지 |
| ~~ShareImage.md~~ | `SI` | **[폐기]** 레디샷(배낭 이미지 생성·공유) — 진입점이 모두 사라져 도달 불가 상태로 방치되다 2026-07-21 코드·스펙 제거. `SI` 프리픽스는 재사용하지 않는다 |
| [Search.md](Search.md) | `SR` | 검색 — Algolia 검색 / 인기 장비 순위 / 창고·배낭 추가 |
| [Auth.md](Auth.md) | `AU` | 로그인 / 약관 동의 / 정보 탭 / 회원 탈퇴 |
| [AppLifecycle.md](AppLifecycle.md) | `APP` | 앱 초기화 / OTA / 전역 알림(Alert·Toast) / 탭 구조 |
| [DataModel.md](DataModel.md) | `DM` | Firestore·Storage·Algolia 데이터 계약 (모든 스펙의 공통 참조) |
| [Analytics.md](Analytics.md) | `AN` | 클릭 로그 지표 — Firebase Analytics 이벤트 수집 |
| [Notification.md](Notification.md) | `NT` | 알림 — 로컬 리마인더(여행 D-1/사용기록) + 원격 푸시(수동 공지) |
| [Feed.md](Feed.md) | `FD` | 장비 피드 — 개인화 둘러보기(탐색 탭) + 카테고리·브랜드 필터 |
| [Weather.md](Weather.md) | `WT` | 배낭 여행지 좌표 기반 기간 예보 |
| [CampSite.md](CampSite.md) | `CS` | 박지 지도 — 지도 탭 / 박지 정보 / 규제 고지 `[기획]` |
| [Home.md](Home.md) | `HM` | 홈 대시보드 — 다가오는 일정 / 남은 할 일 / 장비 추천 `[기획]` |
| [HealthActivity.md](HealthActivity.md) | `HA` | 운동 기록 — 배낭 여행의 실측(거리·경로) 을 HealthKit·Health Connect에서 읽어 표시 `[기획]` |

신규 도메인 스펙은 [Template.md](Template.md)를 복사해서 시작한다.

## 디자인 시스템 (2세대 병존, 2026-08-11)

앱에는 지금 **두 개의 디자인 시스템이 병존한다.** 화면마다 어느 쪽인지가 정해져 있고, **한 화면 안에서 둘을 섞지 않는다.** **Liquid Depth**(토큰 `constants/DesignTokens.ts`의 `Liquid*` 그룹 · 프리미티브 `components/liquid/`)는 유리 면(`expo-blur`)·큰 모서리·알약·떠 있는 카드·지형 지면(`LiquidBackdrop`)을 문법으로 하며 **창고를 제외한 전 화면**이 이 세대다. **Ledger**(장비 원장 — 토큰 `constants/LedgerTokens.ts` · 프리미티브 `components/ledger/`의 `LedgerRow`·`LedgerTextTabs`·`LedgerField`)는 지면이 흰 종이 하나이고 구분을 `여백 → 글자급 → 정렬 → 헤어라인` 순서로만 내며, 카드로 감싸지 않고 목록은 카드가 아니라 행이고 그림자는 실제로 떠 있는 것에만 쓰며 액센트(라임)를 주 액션이 아니라 **선택 상태·활성 지표**에만 쓴다 — **현재 적용 범위는 창고 화면 하나뿐이다**([Warehouse.md](Warehouse.md) §2 화면 문법). 새 UI는 그 화면이 어느 세대인지 먼저 확인하고 해당 토큰·프리미티브만 쓴다. Ledger 화면이 Liquid에서 빌려 쓰는 것은 스켈레톤 셔머 두 개(`useLiquidShimmer`·`LiquidSkeletonBar`)뿐이며(왕복 로직을 두 벌 유지할 이유가 없고 막대는 형태만 갖는 자리라 세대 문법이 걸리지 않는다), 의미색(`danger`·`warn*`·박지·배낭 카테고리 색 등)은 뜻이 값에 묶여 있어 두 세대 모두에서 리디자인 대상이 아니다.

## 스펙 주도 개발 워크플로우

구현 작업(기능 추가, 버그 수정, 리팩토링)은 반드시 아래 순서를 따른다.
단순 질문·탐색·설명에는 적용하지 않는다.

1. **스펙 갱신** — 해당 도메인 스펙에서 요구사항을 추가/수정한다.
   - 신규 요구사항은 제목에 `[제안]` 라벨을 붙인다.
   - 기존 동작 변경이면 기존 요구사항 본문을 고치고 `[제안]` 라벨을 붙인다.
   - 스펙 diff가 곧 변경 요구사항이다. 구현 전에 사용자 확인을 받는다.
2. **테스트 작성** — 현재 테스트 러너가 없으므로(아래 참고), 러너 도입 전까지는 해당 요구사항의 **수동 검증 체크리스트**를 스펙에 먼저 작성하는 것으로 대체한다.
3. **구현** — 태스크별 서브에이전트로 구현한다. 프롬프트에 관련 스펙의 요구사항 ID와 수용 기준을 그대로 포함한다.
4. **검증** — `npm run lint` / `npx tsc --noEmit` 통과 + 수동 검증 체크리스트 수행. **iOS / Android / Web 세 플랫폼**의 분기를 모두 확인한다.
5. **리뷰** — ① 스펙 컴플라이언스 리뷰(요구사항 ID 대비 구현 일치 여부), ② 코드 퀄리티 리뷰, ③ UX/디자인 리뷰(UI 변경이 있는 작업만, 아래 기준). 모두 통과 후 `[제안]` 라벨을 제거하면 스펙이 다시 as-built 상태가 된다.

### UX/디자인 리뷰 기준

**기준 원칙: UX/UI는 Apple Human Interface Guidelines(HIG)를 따른다** (CLAUDE.md 컨벤션). 아래 항목은 이 프로젝트 맥락에서 HIG를 구체화한 체크리스트다.

UI가 바뀌는 작업은 **실행 중인 앱의 스크린샷**(iOS/Android 필수, 웹 노출 기능이면 웹 포함)을 근거로 검토한다. 코드만 보고 판정하지 않는다.

- **시각 일관성** — 여백·아이콘 크기·모서리 반경·색상·타이포(`PretendardText`)가 같은 화면의 기존 요소 및 유사 화면과 어긋나지 않는가.
- **인터랙션 패턴 일관성** — 같은 성격의 기존 기능(모달/알럿/확인 다이얼로그/이동 흐름)과 동일한 패턴을 쓰는가. 새 패턴 도입은 근거가 있는가.
- **터치 타깃** — 탭 가능한 요소가 충분히 큰가(44×44pt 권장). 인접 액션과의 간격은 오탭을 유발하지 않는가.
- **접근성(HIG)** — 아이콘 전용 컨트롤에 `accessibilityLabel`(+`accessibilityRole`)이 있는가(VoiceOver). 텍스트·아이콘 대비가 충분한가(작은 텍스트 4.5:1 지향).
- **위계·주 액션(HIG)** — 내비 타이틀이 화면의 대상을 가리키는가. 화면당 주 액션이 하나로 명확한가. 플로팅/오버레이가 상호작용 콘텐츠를 가리지 않는가.
- **시트 이탈 경로** — 시트에 **닫는 방법이 보이는가**. 판정은 시트 종류로 갈린다(2026-07-31):
  - 네이티브 `formSheet` 라우트 → `sheetGrabberVisible: true`로 **OS가 그래버를 그린다**. 별도 닫기 버튼을 두지 않는다.
  - `presentation: 'modal'`(pageSheet) 라우트와 RN `Modal` 기반 시트 → **OS 그래버가 없다.** 스와이프로 닫히긴 하나 어포던스가 안 보이므로 공용 `SheetGrabberView`(핸들바)를 직접 얹고, 하단이 주 액션(`확인` 등) 하나뿐이면 **적용하지 않고 나가는 길**(우상단 닫기 ×)을 함께 둔다.
  - 핸들바는 시트마다 새로 그리지 않는다 — 예전에 치수·색이 네 갈래로 갈렸고 그중 하나(`borderLight`)는 흰 배경에서 거의 안 보였다.
- **공용 프리미티브 우선** — 같은 그림을 화면에서 다시 그리지 않는다(핸들바와 같은 이유: 복제는 반드시 값이 갈린다). **먼저 그 화면의 세대를 확인한다**(위 디자인 시스템 절): Ledger 화면(현재 창고)은 `components/ledger/`의 `LedgerRow`·`LedgerTextTabs`·`LedgerField`를 쓰고 Liquid 프리미티브를 들이지 않는다(예외는 스켈레톤 셔머 2종). Liquid Depth 화면은 `components/liquid/`에 있는 것을 먼저 찾는다: 카드·알약·칩·필드(`LiquidCard`·`LiquidPillButton`·`LiquidChip`·`LiquidSearchField`·`LiquidGlassField`), 유리 크롬(`LiquidHeaderChrome` — 헤더 행 + 유리 원 back + 우측 캡슐 + 가운데 타이틀, `LiquidGlassCapsule`·`LiquidGlassCircleButton`), 시트(`LiquidBottomSheet`·`LiquidSheetCloseButton`), 지면(`LiquidBackdrop`), 로딩 셔머(`useLiquidShimmer` + `LiquidSkeletonBar`). 값이 프리미티브와 어긋나면 **프리미티브 값이 목업 수치보다 우선**한다(GD-1·CS-3 선례). 새 프리미티브가 필요하면 화면 안에 두지 말고 `components/liquid/`에 만든다.
- **상태 커버리지** — 로딩/빈/에러/비로그인 상태의 UI가 처리되어 있는가.
- **문구** — 한글 문구의 톤(존댓말)·용어가 기존 문구와 일관적인가.
- **플랫폼 렌더링** — 아이콘 매핑(iOS SF Symbol ↔ Android/웹), 키보드 회피, 세이프에어리어가 세 플랫폼에서 깨지지 않는가.

이슈는 심각도(차단/권고/제안)로 분류하고, 차단 이슈만 수정 후 재리뷰한다.

> **테스트 러너**: 현재 미설정(`package.json`에 `test` 스크립트 없음). 테스트를 도입할 때 러너 선택을 사용자에게 먼저 확인할 것 (CLAUDE.md 참고).

## 요구사항 작성 규칙

- **ID**: `프리픽스-번호` (예: `WH-3`). 번호는 문서 내에서 증가만 하고 **재사용하지 않는다**.
- **폐기**: 삭제하지 말고 제목에 `[폐기]`를 붙이고 본문을 한 줄 사유로 대체한다.
- **수용 기준**: 각 요구사항은 검증 가능한 수용 기준(조건 → 기대 동작)을 갖는다.
- **참조**: 커밋 메시지·PR 본문에 관련 요구사항 ID를 명시한다 (예: `BD-4 무게 계산 수정`).
- **코드 참조**: 파일 경로만 적고 **라인 번호는 적지 않는다** (금방 낡는다).
- **데이터 계약**: Firestore 필드·경로는 [DataModel.md](DataModel.md)에만 정의하고 다른 스펙은 링크로 참조한다.
- **언어**: 문서·UI 문구는 모두 한글로 적는다. UI 문구는 코드의 실제 문자열을 그대로 인용한다.

## 스펙 문서 구조

각 도메인 스펙은 다음 섹션을 갖는다 (Template.md 참고):

1. **개요** — 도메인이 해결하는 문제 한 단락
2. **화면 및 진입** — 라우트 → Wrapper → Screen/View 체인, 진입 경로
3. **요구사항** — ID + 사용자 스토리 + 수용 기준
4. **데이터** — DataModel.md 참조 + 도메인 고유 규칙
5. **플랫폼 분기** — iOS / Android / Web 차이
6. **엣지 케이스** — 비로그인 / 빈 상태 / 로딩 / 에러
7. **수동 검증 체크리스트** — 릴리스 전 손으로 확인할 항목
8. **미해결 질문** — 코드에서 발견된 모호함·버그 의심 지점
