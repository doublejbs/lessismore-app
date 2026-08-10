# 시작하기 — Claude Code에 이 디자인 넘기기

## 1. 스킬로 설치 (한 번만)

이 폴더를 리포지토리의 스킬 디렉터리로 통째로 옮깁니다.

```bash
mkdir -p .claude/skills/useless-design
cp -R design_handoff_liquid_depth/* .claude/skills/useless-design/
mv .claude/skills/useless-design/skill/SKILL.md .claude/skills/useless-design/SKILL.md
rmdir .claude/skills/useless-design/skill
```

`.claude/skills/useless-design/` 안에 `SKILL.md`가 최상단에 오면 설치 완료입니다.
Claude Code에서 `/useless-design`으로 부를 수 있습니다.

## 2. 규칙 심기 (한 번만)

`CLAUDE.md`의 내용을 리포지토리 루트 `CLAUDE.md`에 붙여넣습니다.
이미 `CLAUDE.md`가 있다면 "디자인" 절로 합치세요.
Claude Code가 매 대화마다 자동으로 읽어서, 프롬프트에 매번 규칙을 적지 않아도 됩니다.

```bash
cat design_handoff_liquid_depth/CLAUDE.md >> CLAUDE.md
```

## 3. 작업 시작

`PROMPTS.md`의 프롬프트를 **순서대로 하나씩** 붙여넣습니다.
0번(토큰) → 1번(프리미티브) → 2번(화면, 한 번에 하나) → 3번(지면 레이어) → 4번(회귀 확인).

한 프롬프트가 끝날 때마다 diff를 확인하고 커밋하세요.
화면을 여러 개 한 번에 시키면 토큰이 섞이고 되돌리기 어려워집니다.

## 자주 겪는 상황

| 상황 | 대처 |
| --- | --- |
| 값이 애매하다고 되물음 | `mockup-liquid-depth.dc.html`의 해당 화면을 열어보라고 하세요 |
| 하드코딩 hex가 들어감 | "`Liquid*` 토큰으로 바꾸고 남은 리터럴을 보고해줘" |
| 한글이 깨져 보임 | Archivo Narrow가 한글에 걸린 것 — 숫자·라틴 전용입니다 |
| 탭 아이콘이 Ionicons로 바뀜 | 탭바는 SF Symbols 유지. 웹 목업 아이콘은 대체품입니다 |
| ACG 화면이 망가짐 | `Acg*` 토큰을 지웠는지 확인 — 두 세대는 공존해야 합니다 |
