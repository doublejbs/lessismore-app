# useless — Design System

가벼운 백패킹을 위한 장비·배낭 관리 앱 **useless**(lessismore-app)의 디자인 시스템입니다.
"덜어내기"가 제품의 주제라, 시스템도 같은 원칙을 따릅니다 — 액센트 하나, 화면당 주 액션 하나, 숫자 하나가 앵커.

## 출처

- **코드**: `github.com/doublejbs/lessismore-app` (`develop` 브랜치) — Expo 57 / React Native 0.86 / MobX
- 토큰 원본: `constants/DesignTokens.ts` (`Acg` · `AcgSemantic` · `AcgFont` · `AcgShadow` · `AcgLayout`)
- 화면 원본: `components/` 이하 각 도메인 폴더 (`home/`, `feed/`, `bag-detail/`, `warehouse/`, `camp-site/` …)
- 프로젝트 루트의 `github.md`에 화면↔소스 매핑표가 있습니다.

## 이 시스템의 위치

앱의 현재 디자인은 **ACG("지형 위에 붙인 필드 노트")** — 따뜻한 회색 지면, 각진 모서리(radius 0), 형광펜 띠.
이 디자인 시스템은 그 다음 세대인 **Liquid Depth**를 정의합니다: iOS 26 리퀴드 글래스를 받아들여 지면을 중성 회색으로 옮기고,
모서리를 20–28px로 열고, 유리 크롬이 콘텐츠 위를 떠다니게 했습니다. 라임 액센트와 지형 배경, 콘덴스드 숫자는 그대로 승계합니다.

- 현재 앱 재현: `LessIsMore Screens.dc.html`
- 채택된 방향(12화면): `Redesign A - Liquid Depth.dc.html`
- 검토했던 대안: `Redesign B - Editorial Dark.dc.html`, `Redesign - Editorial Light.dc.html`

---

## VISUAL FOUNDATIONS

### 지면과 층
화면은 세 개의 층으로 쌓입니다.
1. **지면** `--canvas #F2F2F6` — 홈·배낭 상세·패킹·정보에는 지형 사진(`assets/images/acg-terrain.png`)을 0.8~0.85로 깔고, 위에서 아래로 옅어지는 베일(.10 → .36 → .52)을 겹칩니다. 위쪽에서는 산세가 읽히고 아래 목록 구간은 조용해집니다.
2. **종이 면** `--surface #FFFFFF` — 카드·목록. 그림자는 접지 1px + 넓은 확산 한 겹(`--shadow-card`)이며 절대 진하지 않습니다.
3. **유리 크롬** — 탭바, 헤더 버튼 캡슐, 검색 필드. `rgba(255,255,255,.66)` + `blur(30px) saturate(180%)` + `.5px` 흰 테두리. **콘텐츠는 그 아래로 흐릅니다**(하단 130px 비움).

라임 라디얼 글로우를 지면 모서리에 하나 둡니다 — 브랜드 색이 UI를 지배하지 않으면서 화면에 온기를 줍니다.

### 색
- 액센트는 **라임 `#C8F244` 하나뿐**입니다. 밝은 면 위에서 라임 글자는 대비가 부족하므로 **면으로만** 쓰고 그 위 글자는 잉크(`--lime-on`)를 씁니다. 텍스트로 라임 계열이 필요하면 `--lime-ink #5C7A12`.
- 잉크는 6단계(`ink` → `ink-faint`). 색상 계열이 아니라 명도만으로 위계를 냅니다.
- 의미색(박지 유형, 경고, 삭제, 배낭 카테고리)은 뜻이 값에 묶여 있어 리디자인해도 **바꾸지 않습니다**.

### 타입
- **Pretendard**가 UI 전부. 크기가 커질수록 자간을 좁힙니다(34px → −1.2px).
- **Archivo Narrow 700**은 숫자·라틴 전용. 한글 글리프가 없어 한글에 쓰면 글자가 깨집니다 — 무게, D-day, 기간, 진행률, 버전에만.
- 섹션은 큰 제목 대신 **대문자 + .16em 마이크로 라벨**로 엽니다. 이게 이 시스템의 서명입니다.

### 모서리
칩과 버튼은 **완전한 알약**(height/2), 카드는 20–26px, 시트는 상단만 28px. 각진 면은 없습니다.
원형은 아이콘 전용 컨트롤(32–48px)에만.

### 애니메이션 · 상태
- 전환은 스프링, **오버슈트 없음**(`overshootClamping`) — 진행 바나 체크가 목표를 지나쳤다 돌아오면 값이 틀린 것처럼 보입니다.
- 누름은 `activeOpacity 0.7~0.85`(색 변화 없음). 크기를 줄이지 않습니다.
- 완료된 항목은 **0.6~0.65 투명도**로 낮추고 지우지 않습니다.

### 레이아웃
좌우 20px, 카드 사이 10px, 섹션 사이 26px. 터치 타깃 최소 44×44. 하단 고정 바는 지면색 그라디언트로 콘텐츠를 받습니다.

---

## CONTENT FUNDAMENTALS

- **한국어, 해요체.** "담아보세요", "확인하세요". 명령형(`하십시오`)이나 광고체는 쓰지 않습니다.
- **사용자를 '나'로 부릅니다** — `내 창고`, `내 정보`, `내 기록`. 앱이 사용자를 부를 때는 주어를 생략합니다.
- **숫자는 단위까지 붙여 한 덩어리로**: `8.4kg`, `907g`, `7/12`, `D-6`.
- **같은 것은 같은 말로.** 패킹 진행은 어디서나 `패킹 {n}/{m}`, 여행지는 어디서나 `여행지`.
- **빈 상태는 사실 + 다음 걸음** 두 줄: "아직 계획한 여행이 없어요" / "이번 주말 1박으로 하나 만들어 둘까요?"
- **이모지를 쓰지 않습니다.** 유일한 예외는 등록된 박지를 표시하는 `📍` 접두(원본 앱 규칙).
- 영문 마이크로 라벨(`NEXT TRIP`, `WAREHOUSE — 42`)은 장식이 아니라 계기판 라벨의 톤입니다. 한글 라벨(`여행 예정`)과 섞어 씁니다.

---

## ICONOGRAPHY

- 앱은 **Ionicons**(`@expo/vector-icons`)를 씁니다. 웹 재현에서도 같은 세트를 CDN(`ionicons@7.4.0`)으로 불러옵니다 — 임의로 SVG를 그리지 않습니다.
- iOS 탭바만 **SF Symbols**(`house.fill`, `magnifyingglass`, `map.fill`, `figure.hiking`, `person.fill`)를 네이티브로 씁니다. 웹에는 SF Symbols가 없어 Ionicons `home / search / map / walk / person`으로 **대체**했습니다 — ⚠️ 정확한 매칭이 아니므로 네이티브 빌드에서는 원본 심볼을 그대로 두세요.
- 굵기는 대부분 `-outline` 변형, 상태가 켜진 것(즐겨찾기 별, 활성 탭)만 채운 변형.
- 자체 아이콘 폰트나 SVG 스프라이트는 없습니다.
- 브랜드 마크: `assets/images/logo.png`(워드마크), 장식 배지 `internet.png` · `magma.png`, 지형 배경 `acg-terrain.png`. 모두 원본 저장소에서 그대로 가져왔습니다 — 새로 그리지 않았습니다.

---

## Intentional additions

원본 앱에는 대응 컴포넌트가 있으나 이름이 다른 것들입니다. 새로 발명한 프리미티브는 없습니다.

| 여기 | 원본 |
| --- | --- |
| `Chip` | `components/browse/CategoryChipView.tsx` |
| `PillButton` | `components/FloatingPillButton.tsx` |
| `Card` | `components/acg/AcgPaperView.tsx` + `AcgGlassView.tsx` |
| `MetricRow` | `components/warehouse/GearView.tsx` |
| `SectionLabel` | `AcgHighlightText`가 맡던 섹션 제목 (형광펜 → 마이크로 라벨로 교체) |
| `ProgressBar` | `components/bag-packing/BagPackingHeaderView.tsx` |
| `StatTile` | `components/warehouse-detail/WarehouseDetailUsageHeroView.tsx` |

---

## Index

- `styles.css` — 소비자가 링크하는 단일 진입점(@import 목록)
- `tokens/` — `fonts` · `colors` · `typography` · `spacing` · `radius` · `elevation`
- `components/core/` — Chip · PillButton · Card · MetricRow · SectionLabel · ProgressBar · StatTile
- `guidelines/` — 파운데이션 스페시먼 카드 15장
- `assets/fonts/` — Pretendard 4종 (Regular/Medium/SemiBold/Bold)
- `assets/images/` — logo · acg-terrain · internet · magma
- `github.md` — 원본 저장소 동기화 기록 + 화면↔소스 매핑
- `SKILL.md` — Claude Code에서 스킬로 쓰기 위한 진입점
