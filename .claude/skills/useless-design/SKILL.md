---
name: useless-design
description: Use this skill for any UI work on useless (lessismore-app) — production screens, prototypes, mocks. Contains the Liquid Depth design system, RN design tokens, component specs, and a 12-screen reference mockup.
user-invocable: true
---

먼저 `README.md`를 읽으세요 — 이 스킬의 핸드오프 문서이자 화면별 스펙입니다.
그 다음 필요한 만큼 탐색합니다:

- `design-system.md` — 디자인 원칙, 색·타입·모서리·카피 규칙, 아이코노그래피
- `rn/DesignTokens.liquid.ts` — React Native용 토큰. 프로덕션 코드는 여기서 시작
- `mockup-liquid-depth.dc.html` — 12화면 목업(픽셀 기준 정본). 값이 애매하면 이걸 여세요
- `components/core/*.prompt.md` — 프리미티브 7종의 사용 규칙
- `tokens/*.css`, `guidelines/*.html` — 토큰 정본과 스페시먼
- `github.md` — 화면 ↔ 리포지토리 소스 매핑
- `PROMPTS.md` — 단계별 작업 프롬프트

프로덕션 코드를 쓸 때: 기존 `Acg` 토큰을 지우지 말고 `Liquid` 그룹을 나란히 두고,
이식이 끝난 화면만 옮깁니다. 목업의 웹 표현(backdrop-filter, ion-icon)은
expo-blur / @expo/vector-icons로 옮기고, 탭바는 SF Symbols를 유지합니다.

프로토타입·목업을 만들 때: 에셋을 복사해 정적 HTML로 만들고 `styles.css`를 링크합니다.

안내 없이 이 스킬이 호출되면, 무엇을 만들지 묻고 디자이너로서 질문한 뒤
필요에 따라 HTML 아티팩트 또는 프로덕션 코드를 내놓으세요.
