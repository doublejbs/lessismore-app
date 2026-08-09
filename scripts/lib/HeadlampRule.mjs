/**
 * 헤드랜턴 판정 규칙 (DM-4) — 카탈로그·사용자 문서 이관 스크립트가 **함께** 쓴다.
 * 두 곳이 갈리면 같은 장비가 카탈로그와 내 창고에서 다르게 분류되는 불일치가 다시 생긴다.
 */

/** 1차: 이름에 '헤드 + 램프/랜턴/라이트'가 있는 경우. */
const NAME_RULE =
  /헤드\s*(램프|랜턴|라이트)|head\s*(lamp|torch)|headlamp|headlight/i;

/**
 * 2차: 모델명만 적혀 이름으로는 못 잡는 라인.
 *
 * 사용자가 직접 등록한 장비는 표기가 제각각이라(브랜드를 영문으로 쓰거나 '헤디'처럼
 * 줄여 쓰거나) 1차 규칙만으로는 샌다. 아래는 전 모델이 헤드랜턴인 라인만 넣는다 —
 * 블랙다이아몬드 랜턴 라인은 모지·올빗·아폴로라 겹치지 않는다.
 */
const MODEL_RULES = [
  /(나이트코어|nitecore).*\b(NU|HC)\s?\d/i,
  /(블랙다이아몬드|black\s*diamond).*(코스모|스프린터|스프린트|cosmo|sprint)/i,
  /크레모아.*헤디/,
];

/** 상품 표기(브랜드+한글명+영문명)를 받아 헤드랜턴인지 판정한다. */
export const isHeadlamp = label =>
  NAME_RULE.test(label) || MODEL_RULES.some(re => re.test(label));

/** 문서 데이터에서 판정용 표기를 만든다. */
export const toLabel = data =>
  `${data.companyKorean ?? ''} ${data.company ?? ''} ${data.nameKorean ?? ''} ${data.name ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();
