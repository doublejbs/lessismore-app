# Claude Code 작업 프롬프트

설치는 `START-HERE.md`를 먼저 보세요. `.claude/skills/useless-design`에 설치했다면
각 프롬프트 앞에 `/useless-design`을 붙이고, 설치하지 않았다면
`design_handoff_liquid_depth/README.md를 먼저 읽어줘.`로 시작하면 됩니다.
프롬프트는 **순서대로 하나씩**, 끝날 때마다 커밋하세요.

---

## 0. 토큰 심기 (가장 먼저)
```
design_handoff_liquid_depth/README.md와 rn/DesignTokens.liquid.ts를 읽고,
constants/DesignTokens.ts에 Liquid / LiquidSemantic / LiquidType / LiquidShadow / LiquidLayout
그룹을 추가해줘. 기존 Color·Radius·Spacing·Acg 그룹은 지우지 말고 그대로 둬 —
화면을 하나씩 옮길 거라 두 세대가 공존해야 해.
AcgSemantic.spot* 값이 디자인(#2F6F8F / #4E8C5A / #C9A227)과 다르니, 바꾸지 말고
차이만 보고해줘.
```

## 1. 프리미티브
```
components/liquid/ 아래에 Chip, PillButton, Card, MetricRow, SectionLabel,
ProgressBar, StatTile 7개를 만들어줘.
스펙은 README의 Components 표와 components/core/*.prompt.md에 있어.
props 이름은 참조 구현(components/core/*.d.ts)을 그대로 따라가고,
스타일은 Liquid 토큰만 참조해서 하드코딩 색이 없게 해줘.
유리 면은 expo-blur의 BlurView로 만들고, 그림자는 RN 0.76 boxShadow 문자열을 써.
```

## 2. 화면 이식 (한 번에 하나씩)
```
mockup-liquid-depth.dc.html의 "<화면 이름>" 목업과 README의 해당 절을 기준으로
<리포지토리 경로>를 Liquid Depth로 옮겨줘.
- 레이아웃/색/타이포/모서리/그림자는 목업 값을 그대로 쓴다
- 데이터·스토어 연결과 네비게이션은 기존 코드를 유지한다
- 새 프리미티브(components/liquid/*)로 조립하고, 그 화면에만 필요한 스타일은 로컬에 둔다
- 탭바 아이콘은 SF Symbols를 유지한다(웹 목업의 Ionicons는 대체품)
끝나면 바뀐 파일 목록과 남은 하드코딩 값을 알려줘.
```
권장 순서: 홈 → 배낭 목록 → 배낭 상세 → 패킹 모드 → 창고 → 장비 상세 →
탐색 → 검색 → 지도 → 박지 상세 → 내 정보 → 로그인.

## 3. 지면 레이어 공통화
```
홈·배낭 상세·패킹·내 정보·로그인이 공유하는 배경(지형 이미지 + 그라디언트 베일 +
라임 라디얼 글로우)을 components/liquid/LiquidBackdrop.tsx 하나로 뽑아줘.
prop으로 terrainOpacity와 veil 세기, 글로우 위치를 받게 하고,
각 화면의 값은 README의 화면별 절에 있는 수치를 그대로 넣어줘.
```

## 4. 회귀 확인
```
Liquid로 옮긴 화면들에서 다음을 점검하고 어긋난 곳을 고쳐줘:
- 패킹 진행값(n/m, %, 누적 무게)이 홈·배낭 목록·패킹 헤더에서 같은 소스를 쓰는가
- Archivo Narrow가 한글 문자열에 쓰인 곳이 없는가
- 라임을 글자색으로 쓴 곳이 없는가(밝은 면 위 라임 텍스트는 limeInk #5C7A12)
- 터치 타깃이 44 미만인 곳이 없는가
- 스프링 애니메이션에 overshootClamping이 빠진 곳이 없는가
```
