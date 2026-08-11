/**
 * 법무 문서(개인정보 처리방침·이용약관) 한 줄의 성격(AU-4).
 *
 * 원문은 `constants/LegalTexts.ts`의 **한 덩어리 문자열**이라 조항 제목이 본문과 같은 굵기로
 * 흘렀다(2026-08-11 디자인 리뷰: 훑기 불가). 문자열을 건드리지 않고 렌더 단계에서 줄마다
 * 이 성격을 판정해 굵기·여백을 갈라 준다.
 */
enum PolicyLineKind {
  /** `제1조 (…)` · `부칙 …` — 조항의 머리 */
  Heading = 'heading',
  /** `1. 홈페이지 회원 가입 및 관리` · `▶ 개인정보 보호책임자` — 조항 안의 항목 머리 */
  SubHeading = 'subHeading',
  /** 그 밖의 모든 줄 */
  Body = 'body',
}

export default PolicyLineKind;
