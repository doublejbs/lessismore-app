# Handoff: useless — Liquid Depth 리디자인

## Overview
백패킹 장비·배낭 관리 앱 **useless**(`doublejbs/lessismore-app`, `develop`)의 12개 화면을
다음 세대 디자인 **Liquid Depth**로 옮기기 위한 핸드오프입니다.
현재 앱의 ACG 스타일(따뜻한 회색 지면, radius 0, 형광펜 띠)을 iOS 26 리퀴드 글래스 결로
갈아 끼웁니다 — 중성 회색 지면, 20~28px 라운드, 콘텐츠 위를 떠다니는 반투명 유리 크롬.
라임 액센트(`#C8F244`)·지형 배경·콘덴스드 숫자는 그대로 승계합니다.

## About the Design Files
이 번들의 HTML 파일은 **디자인 레퍼런스**입니다 — 의도한 모양과 동작을 보여주는 프로토타입이지,
그대로 옮겨 붙일 프로덕션 코드가 아닙니다.
할 일은 이 HTML 디자인을 **대상 코드베이스의 기존 환경에서 다시 만드는 것**입니다:

- 대상: **Expo 57 / React Native 0.86 / MobX / expo-router**
- 기존 패턴을 따르세요 — `components/<도메인>/*View.tsx`, `PretendardText`, `Layout`,
  `constants/DesignTokens.ts`, MobX 스토어, `observer()` 래핑.
- 웹 전용 표현(`backdrop-filter`, CSS `box-shadow` 다중 레이어, `ion-icon` 웹 컴포넌트)은
  RN 대응물로 옮깁니다 — 아래 "웹 → RN 변환 규칙" 참고.

## Fidelity
**High-fidelity (hifi)** 입니다. 색·타이포·여백·모서리·그림자 값이 전부 확정되어 있습니다.
목업의 값을 그대로 쓰되, 픽셀 단위로 재현할 수 없는 부분(블러, 그라디언트 베일)은
아래 근사 규칙을 따르세요.

---

## 무엇을 먼저 하나 (권장 순서)

1. `rn/DesignTokens.liquid.ts`를 `constants/DesignTokens.ts`에 **추가**합니다.
   기존 `Acg` 그룹을 지우지 말고 `Liquid` 그룹을 새로 둡니다 — 화면 단위로 옮겨 갈 수 있게.
2. 공통 프리미티브 7개를 `components/liquid/`에 만듭니다(아래 "Components").
3. 화면을 다음 순서로 옮깁니다: 홈 → 배낭 목록 → 배낭 상세 → 패킹 모드 → 창고 →
   장비 상세 → 탐색 → 검색 → 지도 → 박지 상세 → 내 정보 → 로그인.
   앞의 5개가 프리미티브를 전부 소진하므로, 여기까지 하면 나머지는 조립입니다.

---

## Design Tokens

정본은 `tokens/*.css`, RN 이식본은 `rn/DesignTokens.liquid.ts`입니다. 값 요약:

### 색
| 이름 | 값 | 용도 |
| --- | --- | --- |
| ink | `#101012` | 본문·제목·주 액션 면·활성 칩 |
| inkSecondary | `#5E5E68` | 보조 본문 |
| inkTertiary | `#78787F` | 메타·설명 |
| inkMuted | `#8A8A94` | 라벨·비활성·브랜드명 |
| inkSubtle | `#B4B4BC` | 단위·쉐브론 |
| inkFaint | `#D4D4DC` | 빈 체크 원 테두리 |
| canvas | `#F2F2F6` | 화면 지면 |
| surface | `#FFFFFF` | 종이 카드 |
| surfaceSunken | `#EDEDF2` | 진행 트랙, 카드 안 타일 |
| surfaceQuiet | `rgba(255,255,255,.72)` | 지난 항목·비활성 카드 |
| hairline | `rgba(16,16,18,.08)` | 구분선 |
| glassFill | `rgba(255,255,255,.66)` | 탭바·헤더 캡슐 |
| glassFillStrong | `rgba(255,255,255,.85)` | 검색 필드·시트 |
| glassStroke | `rgba(255,255,255,.95)` | 유리 테두리 0.5px |
| lime | `#C8F244` | 유일한 브랜드 액센트 — **면으로만** |
| limeOn | `#101012` | 라임 면 위 글자 |
| limeOnQuiet | `#3E4A16` | 라임 면 위 보조 글자 |
| limeInk | `#5C7A12` | 밝은 면 위 라임 계열 글자 |

의미색(변경 금지): `spotBackpacking #2F6F8F` · `spotShelter #4E8C5A` · `spotCampground #C9A227` ·
`favorite #FFC83D` · `warnBg #FFF3DC` / `warnInk #B65A00` · `danger #FF3B30`.
배낭 카테고리: base `#2F6F8F` · clothing `#4E8C5A` · cooking `#C9A227` · safety `#B2604F` · etc `#7A6A8F`.

> ⚠️ **확인 필요**: 현재 리포지토리의 `AcgSemantic.spot*`은 `#4A90E2 / #50C878 / #FFD700`으로,
> 이 디자인의 `#2F6F8F / #4E8C5A / #C9A227`보다 채도가 높습니다. 지도 마커·필터 칩의 점 색이
> 여기 해당합니다. 디자인 쪽 값(차분한 쪽)으로 통일하는 것을 전제로 목업이 그려져 있으니,
> 값을 바꿀지 리포지토리 값을 유지할지 먼저 정하고 시작하세요.

### 타입 (전부 Pretendard, 숫자만 Archivo Narrow 700)
| 이름 | 크기/행간/굵기 | 자간 |
| --- | --- | --- |
| display | 34/40 · 700 | -1.2 |
| title1 | 32/38 · 700 | -1 |
| title2 | 28/36 · 700 | -0.9 |
| title3 | 22/30 · 700 | -0.6 |
| heading | 17/24 · 600 | 0 |
| body | 15/20 · 500 | 0 |
| bodySm | 13.5/19 · 400 | 0 |
| caption | 12.5/17 · 400 | 0 |
| micro | 11/16 · 600 · UPPERCASE | +0.16em (≈1.76px) |
| numHero | 72/64 · 700 | -2.5 |
| numXl | 42/38 · 700 | -1.2 |
| numLg | 32/36 · 700 | -0.5 |
| numMd | 22/26 · 700 | 0 |
| numSm | 14/18 · 700 | +0.05em |

**Archivo Narrow에는 한글 글리프가 없습니다.** 무게·D-day·기간·진행률·버전 등 숫자/라틴에만 쓰세요.
RN 자간은 em이 아니라 px이므로 `letterSpacing: fontSize * 0.16`처럼 계산합니다.

### 여백 / 모서리 / 그림자
- 화면 좌우 20, 카드 내부 16(히어로 20), 카드 사이 10, 섹션 사이 26, 터치 최소 44.
- 상단 세이프 62(다이나믹 아일랜드), 하단 34, 투명 헤더 44, 탭바 아래 여백 130.
- 모서리: 칩 = height/2(완전 알약), 리스트/타일 20, 카드 22, 히어로·유리 26, 시트 28, CTA·탭바 999.
- 그림자(문자열 그대로 RN `boxShadow`에 넣습니다):
  - card `0 1px 2px rgba(16,16,18,.04), 0 10px 26px rgba(16,16,18,.05)`
  - tile `0 1px 2px rgba(16,16,18,.04), 0 8px 22px rgba(16,16,18,.05)`
  - glass `0 10px 30px rgba(16,16,18,.14)` / glassSm `0 4px 14px rgba(16,16,18,.08)`
  - cta `0 12px 30px rgba(16,16,18,.26)` / accent `0 12px 32px rgba(160,200,40,.35)`
  - sheet `0 -12px 44px rgba(16,16,18,.14)`

---

## 웹 → RN 변환 규칙

| 목업(HTML/CSS) | RN 구현 |
| --- | --- |
| `backdrop-filter: blur(30px) saturate(180%)` | `<BlurView tint="light" intensity={70}>` (expo-blur) + `Liquid.glassFill` 오버레이 + 0.5px `glassStroke` 보더 |
| 다중 `box-shadow` | RN 0.76+ `boxShadow` 문자열 그대로. 구버전 폴백이 필요하면 elevation 4/8/12 |
| 지면 그라디언트 베일 | `expo-linear-gradient`. 홈 기준 `rgba(242,242,246,.10) → .36(45%) → .52(100%)` |
| 라임 라디얼 글로우 | 반지름 150~170의 원형 `View` + `radial` 대체: 낮은 투명도 라임 원 + `blurRadius` 이미지, 또는 `react-native-svg` `<RadialGradient>` |
| `ion-icon` | `@expo/vector-icons`의 `Ionicons` — 이름 동일 |
| 탭바 아이콘 | **네이티브는 SF Symbols 유지** (`house.fill`, `magnifyingglass`, `map.fill`, `figure.hiking`, `person.fill`). 웹 목업의 Ionicons(`home/search/map/walk/person`)는 대체품일 뿐입니다 |
| `aspect-ratio`, `gap` | RN 0.71+ 둘 다 지원. 그대로 사용 |
| 지형 배경 이미지 | `assets/images/acg-terrain.png`, `resizeMode="cover"`, opacity 0.85(홈) / 0.80(배낭 상세·패킹·내 정보) / 0.70(로그인) |

---

## Components

목업 전체가 이 7개 + 지면 레이어로 조립됩니다. 원본 저장소에 대응 컴포넌트가 있으므로
새로 만들기보다 **기존 컴포넌트를 이 스펙으로 고치는** 쪽을 우선하세요.

(`원본` 열은 2026-08-11 이식 완료 기준의 **실제 구현 경로**로 갱신했습니다 — 이전 값들은
이식 전 화면별 컴포넌트라 일부가 이미 사라진 경로였습니다.)

| 컴포넌트 | 스펙 | 구현 |
| --- | --- | --- |
| `Chip` | h34(2차 28) · pad 0 15 · radius h/2 · 선택 = ink 면 + 흰 글자 600 / 비선택 = `rgba(255,255,255,.8)` + 0.5px `rgba(16,16,18,.06)` 보더 + `inkSecondary` 500 · 13.5px · 줄바꿈 금지 | `liquid/LiquidChip.tsx` |
| `PillButton` | 주: h54 · radius 27 · ink 면 · 흰 글자 16/600 · shadow cta. 액센트: 라임 면 + ink 글자 + shadow accent. 유리: `glassFillStrong` + blur | `liquid/LiquidPillButton.tsx` |
| `Card` | paper: `#FFF` · radius 22 · pad 16~18 · shadow card. glass: `rgba(255,255,255,.82)` + blur24 + 0.5px 흰 보더 · radius 26 · shadow glass. quiet: `rgba(255,255,255,.72)` + 보더, 지난 항목용 | `liquid/LiquidCard.tsx` |
| `MetricRow` | 목록 한 줄. pad 15/16 · 브랜드 12/600 `inkMuted` → 이름 15/600 ink → 메타 12 `inkSubtle`, 우측 숫자 Archivo 16~20 · 행 사이 0.5px 헤어라인(좌측 16 들여쓰기) | `liquid/LiquidMetricRow.tsx` |
| `SectionLabel` | 11px/600 · `letterSpacing .16em` · UPPERCASE · `inkMuted` · 아래 여백 10. **이 시스템의 서명** | `liquid/LiquidSectionLabel.tsx` |
| `ProgressBar` | h6(작게) / h8(히어로) · radius h/2 · 트랙 `surfaceSunken` 또는 `rgba(16,16,18,.14)` · 채움 ink(유리·라임 면 위) 또는 라임(흰 카드 위) | `liquid/LiquidProgressBar.tsx` |
| `StatTile` | radius 20 · pad 16 · 숫자 Archivo 34/34 → 라벨 12.5/600. 강조 1개만 라임 면 | `liquid/LiquidStatTile.tsx` |

각 컴포넌트의 `.jsx` 참조 구현과 `.d.ts` 인터페이스, 사용 규칙 `.prompt.md`가
`components/core/`에 있습니다. RN 포팅 시 props 이름은 그대로 가져가세요.

---

## Screens / Views

12화면 공통: 지면 `canvas` → (일부) 지형 이미지 + 그라디언트 베일 → 라임 라디얼 글로우 →
콘텐츠(상단 패딩 62, 헤더 있으면 106) → 떠 있는 유리 탭바(h60, radius 30, 좌우 14, 하단 8).

### 1. 홈 — `components/home/`
- 지형 배경 0.85 + 베일(.10/.36/.52) + 라임 글로우(좌상단) + 파랑 글로우(우측 top 180).
- 헤더: `금요일, 8월 9일`(13/500 `inkTertiary`) → `다음 여행까지`(32/38, -1) · 우측 42px 유리 원형 알림 버튼.
- **히어로 = 라임 카드**(radius 28, shadow accent): D-6 검정 알약 배지(Archivo 14) → 여행 이름 24/30 →
  📍위치 14/500 `limeOnQuiet` · 우측 큰 무게 `8.4`(Archivo 44) + `kg 총 무게` 12/600.
  카드 안 유리 판(radius 20, `rgba(255,255,255,.55)` + blur12): `패킹 진행` / `7/12` · 진행바 h8(트랙 `rgba(16,16,18,.14)`, 채움 ink) · 날씨 + 기간 한 줄.
  하단 ink CTA h54 `패킹 시작하기` + 라임 화살표.
- 다음 여행 한 줄 카드(radius 20): `D-21` Archivo 15 `inkTertiary` · 이름 14/500 · 쉐브론.
- `내 창고` 19/700 + 개수 13/600 → 카테고리 칩 가로 스크롤(좌우 -20 블리드) → 장비 2줄 카드 + `전체 보기`(`limeInk`).

### 2. 탐색 피드 — `components/feed/`
- 지형 없음. 우상단 라임 글로우만.
- `탐색` 32/38 → 유리 검색 필드(h48, radius 24, `rgba(255,255,255,.75)` + blur24, placeholder `'헬리녹스'를 검색해보세요`).
- 칩 줄 → 필터 줄(`브랜드 2` 아웃라인 칩 h32 · 우측 `가벼운 순` + 쉐브론).
- **2열 그리드**(col-gap 12, row-gap 14): 카드 radius 22 · pad 16 · 브랜드 12.5/600 `inkMuted` +
  우상단 32px 원형 담기 버튼(미담김 = 라임 면 + `add`, 담김 = ink 면 + 라임 `checkmark`) →
  제품명 15/20/600 → 무게 Archivo 32 + 단위 16 `inkMuted` → 있으면 `쿠팡 최저가` 12/500 `limeInk` + 쉐브론.
- 하단 130 위 떠 있는 `인기 순위` 알약(`rgba(16,16,18,.88)` + blur, 라임 아이콘).

### 3. 검색 결과 — `components/search-page/`
- 탐색과 같은 그리드. 상단만 다름: 채워진 검색 필드(`rgba(255,255,255,.85)`, 값 15.5/500 ink, 우측 `close-circle` `inkSubtle`) →
  `검색 결과` 22/700 + 개수 Archivo 17 `inkMuted` → 칩 줄.

### 4. 지도 — `components/camp-site/`
- 전체 화면 지도. 상단 유리 오버레이(검색 필드 h48 `rgba(255,255,255,.9)` → 유형 칩(색 점 8px 포함) → 지형 칩 h28).
- 마커: 일반 = 16px 원 + 2.5px 흰 테두리 + 의미색, 라벨은 12/600 + 흰 텍스트 섀도 3중.
  선택 = 34×44 핀(라임 면 + 2px ink 스트로크 + ink 중심 원), 라벨 13/600을 핀 아래.
- 우측 하단(bottom 150) 세로 버튼 2개: 즐겨찾기(유리 원 48, `favorite` 별) · 현재 위치(라임 원 48, shadow accent).

### 5. 배낭 목록 — `components/bag/`
- `배낭` 32/38 + `4개 · 평균 8.0kg` 13/500 · 우측 `최신순` 정렬 드롭다운.
- `여행 예정` / `지난 여행` SectionLabel로 구간을 나눕니다.
- **예정 카드**(흰 카드 radius 22, pad 18): D-day 배지(가장 임박 = 라임 면 + Archivo 12, 그 외 = `rgba(16,16,18,.07)` + `inkSecondary`) →
  이름 17/600 → 기간 Archivo 12.5 `inkMuted` · 우측 무게 Archivo 30 + 단위 14.
  **가장 임박한 카드에만** 하단 진행 줄: 트랙 h6 `surfaceSunken` + 라임 채움 + `7/12` Archivo 13.
- **지난 카드**: `surfaceQuiet` + 0.5px 보더, 배지 = ink 면 + 라임 체크 + `패킹 완료`, 숫자는 `inkSecondary`/`inkSubtle`로 낮춤.
- 우하단(bottom 130) ink FAB 알약 h52 `배낭 추가` + 라임 `add`.

### 6. 배낭 상세 — `components/bag-detail/`
- 지형 0.8 + 베일(.14/.42/.58). 헤더: 유리 뒤로가기 원 38 · 우측 유리 캡슐(복제/공유/필름 3개 아이콘).
- 타이틀 블록: `여행 예정 · D-6` 회색 알약 h26 → 이름 30/38 → 기간 Archivo 14 `inkMuted`.
- **무게 히어로 카드**(radius 26, pad 20): `8.4` Archivo 54 + `kg` 18/600 + 우측 라임 델타 배지(`-0.6kg`) →
  카테고리 스택바 h10(세그먼트 사이 gap 3, 각 세그먼트 radius 5, 색 = ink/limeInk/lime/`#B4B4BC`/`#DEDEE4`) →
  범례 12.5 `inkSecondary`.
- 2×2 타일(radius 22, min-h 96): 첫 타일만 ink 면 + 라임 아이콘(날씨), 나머지 흰 면 + ink 아이콘.
- `담긴 장비` 섹션: 칩 줄 h32 → MetricRow 카드.
- 하단 고정 바: 유리 캡슐 `7/12`(bag-check 아이콘) + ink CTA `장비 추가`(flex:1).

### 7. 패킹 모드 — `components/bag-packing/`
- 지형 0.8 + 강한 베일(.16/.50/.70). 헤더: 유리 뒤로가기 · `처음부터 다시` 유리 알약.
- **진행 유리 카드**(radius 26, `rgba(255,255,255,.82)` + blur24): `7` Archivo 52 + `/ 12` Archivo 24 `inkSubtle` ·
  우측 라임 알약 `58%` · 진행바 h8(트랙 `surfaceSunken`, 채움 ink) · `4.9kg / 8.4kg` Archivo 14 `inkTertiary`.
- 카테고리별 SectionLabel + 항목 행(radius 20, pad 14/16).
  - **미체크**: 흰 면 + shadow tile · 무게 Archivo 17 ink · 우측 26px 빈 원(1.5px `inkFaint` 보더).
  - **체크됨**: `rgba(255,255,255,.62)` 면(그림자 없음) · 텍스트 블록 opacity 0.6 · 무게 `inkSubtle` · 26px ink 원 + 라임 체크.
  - 체크된 항목은 **지우지 않고 자리에 남깁니다**.

### 8. 창고 — `components/warehouse/`
- 헤더 유리 캡슐(검색 + 추가). `창고` 32/38 + `42개 · 18.6kg`, 우측 `무거운 순`.
- 칩 줄 → 라임 톤 알림 칩 h30(`rgba(200,242,68,.35)` + `rgba(160,200,40,.5)` 보더 + `limeInk` 글자, `안 쓴 장비 7`).
- 하나의 흰 카드 안에 MetricRow 6줄: 브랜드 12/600 → 이름 15/600 → `Black · 사용률 82%` 12 `inkSubtle` · 우측 무게 Archivo 20.

### 9. 장비 상세 — `components/warehouse-detail/`
- 헤더: 유리 뒤로가기 · 유리 캡슐(공유 + `수정` 텍스트).
- 브랜드 13/600 → 이름 28/36 → 태그 칩 2개 + 우측 무게 Archivo 42 + 단위 18.
- `사진 추가` 점선 슬롯(h56, radius 20, 1.5px dashed `rgba(16,16,18,.16)`).
- `사용 기록` SectionLabel + StatTile 3개(첫 번째만 라임 면 + shadow accent).
- `스펙` SectionLabel + 스펙 카드(라벨 96px 고정폭 `inkMuted` / 값 13.5/500 ink, 행 사이 0.5px).
- 하단 고정 ink CTA `내 창고에 추가하기` — 지면색 그라디언트(`#F2F2F6 60%` → 투명)로 받습니다.

### 10. 박지 상세 — `components/camp-site/CampSiteDetail*`
- 상단 96px에 지도가 비치고, 그 아래는 **시트**(radius 28 상단, `canvas` 면, shadow `0 -10px 40px`).
  상태바 글자는 이 화면에서만 흰색입니다.
- 시트 상단 그랩바 38×5 → 유형 배지(ink 면 + 라임 글자) + 지역 13 → 이름 26/32 → 설명 14/22 →
  액션 칩 3개(h40, 흰 면, 즐겨찾기 별 `favorite`) → 16:9 사진 슬롯(radius 20).
- 탭바 3분할(개요/날씨/후기, 활성 = ink 알약 h38).
- 해시태그 칩 → 경고 배너(`warnBg` 면, radius 18, `warnInk` 아이콘 + 13/20 텍스트) → `시설` 카드(아이콘 + 라벨 2줄 랩).
- 하단 고정 **라임 CTA** `배낭 여행지로 설정` — 앱에서 유일하게 라임을 주 액션에 쓰는 자리입니다.

### 11. 내 정보 — `app/(tabs)/info.tsx`
- 지형 0.8 + 베일. `내 정보` 32/38.
- **프로필 유리 카드 하나에 지표 3개를 합쳤습니다**(기존 분리 카드 → 통합):
  48px 라임 아바타(이니셜 19/700) + 이름 18/700 + `Google 로그인` 12.5 + 편집 아이콘,
  아래 `F2F2F6` 타일 3개(42 장비 / 9 여행 / 7 안 쓴 장비 — 마지막 숫자만 `limeInk`).
- 메뉴 카드 4줄(아이콘 20 `inkSecondary` · 라벨 15/500 · 쉐브론, 헤어라인 좌측 48 들여쓰기).
- `로그아웃`은 `surfaceQuiet` 카드로 분리(빨강 아님).
- 푸터: 배지 이미지 2개(40px, opacity .75) · `VERSION 1.1.5` Archivo 11.5 + `사업자 정보` · `탈퇴하기` 밑줄 11.5 `inkSubtle`.

### 12. 로그인 — `components/login/LogInView.tsx`
- **모달이 아니라 바텀 시트**로 바뀌었습니다. 뒤 화면은 지형 0.7 + 베일 + blur(2px).
- 시트: radius 32 상단, `rgba(255,255,255,.88)` + blur36, 상단 0.5px 흰 보더, shadow sheet, pad 28/20/44.
- 로고 30px 중앙 → `가진 것을 알면 / 더 가볍게 떠날 수 있어요` 22/30/700 2줄 →
  보조 문구 13.5 `inkTertiary` → Google 버튼(ink 면, 컬러 로고) → Apple 버튼(흰 면 + 1px `rgba(16,16,18,.12)` 보더) →
  `이메일로 로그인` 텍스트 버튼 h48 → 약관 안내 11.5/18 `inkSubtle` 2줄 중앙.

---

## Interactions & Behavior
- 전환은 **스프링, 오버슈트 없음**(`overshootClamping: true`). 진행바·체크가 목표를 지나갔다 돌아오면 값이 틀린 것처럼 보입니다.
- 누름은 `activeOpacity 0.7~0.85`. 색을 바꾸거나 크기를 줄이지 않습니다.
- 패킹 체크: 낙관적 토글 → 진행바·퍼센트·누적 무게가 같은 스프링으로 함께 움직입니다. 완료 항목은 opacity 0.6으로 낮추고 **자리 이동 없음**.
- 담기 버튼(탐색/검색): 라임+`add` ↔ ink+`checkmark` 토글, 아이콘만 크로스페이드(150ms).
- 스크롤: 유리 크롬은 항상 떠 있고 콘텐츠는 그 아래로 흐릅니다(하단 130 여백). 헤더 유리 캡슐은 스크롤과 무관하게 고정.
- 빈 상태는 두 줄 — 사실 + 다음 걸음. 예: "아직 계획한 여행이 없어요" / "이번 주말 1박으로 하나 만들어 둘까요?"
- 로딩: 스켈레톤은 `surfaceSunken` 면 + 1.2s 셔머. 스피너는 쓰지 않습니다.

## State Management
기존 MobX 구조를 그대로 씁니다. 이번 리디자인이 새로 요구하는 상태:
- `bagStore`: 배낭별 `packedCount / totalCount`, `packedWeight / totalWeight`, `dday` — 홈 히어로·배낭 목록 카드·패킹 헤더가 같은 값을 씁니다(세 곳이 어긋나면 안 됨).
- `bagStore`: 카테고리별 무게 비율(스택바용) — 상세 히어로.
- `warehouseStore`: `unusedCount`(안 쓴 장비) — 창고 알림 칩과 내 정보 지표가 공유.
- `campSiteStore`: 선택 마커 id(핀 확대 표현), 필터(유형 + 지형) 두 축.
- 정렬 상태(`최신순` / `무거운 순` / `가벼운 순`)는 화면별로 유지.

## Content
한국어 해요체. 사용자를 `내 창고`, `내 정보`처럼 '나'로 부릅니다. 숫자는 단위까지 한 덩어리(`8.4kg`, `907g`, `7/12`, `D-6`).
같은 개념은 같은 말로(`패킹 {n}/{m}`, `여행지`). 이모지 금지 — 등록된 박지의 `📍` 접두만 예외.
카피 규칙 전문은 `design-system.md`의 CONTENT FUNDAMENTALS를 보세요.

## Assets
전부 원본 저장소에서 가져온 것으로, 새로 그린 것은 없습니다.
- `assets/fonts/Pretendard-{Regular,Medium,SemiBold,Bold}.ttf`
- `assets/images/acg-terrain.png` — 지형 배경(홈·배낭 상세·패킹·내 정보·로그인)
- `assets/images/logo.png` — 워드마크(로그인 시트)
- `assets/images/internet.png`, `magma.png` — 내 정보 푸터 배지
- 아이콘은 `@expo/vector-icons`의 Ionicons. 자체 SVG 스프라이트 없음.

## Files
| 파일 | 내용 |
| --- | --- |
| `mockup-liquid-depth.dc.html` | **12화면 목업(픽셀 기준 정본)**. 브라우저로 바로 열립니다 |
| `design-system.md` | 디자인 시스템 서술 — 원칙·색·타입·모서리·카피·아이콘 |
| `rn/DesignTokens.liquid.ts` | RN용 토큰 모듈. `constants/DesignTokens.ts`에 붙여 넣습니다 |
| `tokens/*.css` | 토큰 정본(CSS 변수) |
| `components/core/*` | 프리미티브 7종 참조 구현 + `.d.ts` + 사용 규칙 |
| `guidelines/*.html` | 파운데이션 스페시먼 15장(색·타입·여백·모서리·그림자·유리·지형) |
| `styles.css` | 토큰 진입점(@import) |
| `github.md` | 화면 ↔ 리포지토리 소스 매핑표 |
| `PROMPTS.md` | Claude Code에 그대로 붙여 넣을 작업 프롬프트 |
| `skill/SKILL.md` | `.claude/skills/useless-design/`에 넣어 쓰는 스킬 진입점 |

## Claude Code에서 스킬로 쓰기
```
cp -r design_handoff_liquid_depth ~/dev/lessismore-app/.claude/skills/useless-design
mv ~/dev/lessismore-app/.claude/skills/useless-design/skill/SKILL.md \
   ~/dev/lessismore-app/.claude/skills/useless-design/SKILL.md
```
이후 Claude Code에서 `/useless-design`으로 호출하면 이 문서를 읽고 브랜드에 맞춰 작업합니다.
