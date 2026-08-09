/**
 * 레거시 그룹 키(`furniture`·`cooking`)를 세분 카테고리로 가르는 규칙 (DM-4).
 *
 * **한글 뒤에 `\b`(단어 경계)를 쓰지 말 것.** `\b`는 ASCII 단어문자 기준이라 `컵\b`는
 * '싱글컵 320ml'처럼 뒤에 공백이 오는 흔한 표기를 못 잡는다(한글도 공백도 비단어라
 * 경계가 서지 않는다). 실제로 이 실수로 컵·팬·볼이 전부 기타로 떨어졌었다.
 *
 * 카탈로그(`/gear`)와 사용자 창고(`users/{uid}/gears`) 이관이 **같은 규칙**을 쓴다 —
 * 갈리면 같은 장비가 두 곳에서 다르게 분류되는 불일치가 생긴다.
 *
 * 규칙은 **위에서부터 먼저 맞는 것**을 쓴다. 순서가 결과를 바꾸므로 아래 주석의 의도를
 * 지켜서 수정할 것.
 */

/** 판정용 표기 — 브랜드(한/영) + 상품명(한/영)을 이어 붙인다. */
export const toLabel = data =>
  `${data.companyKorean ?? ''} ${data.company ?? ''} ${data.nameKorean ?? ''} ${data.name ?? ''}`
    .replace(/\s+/g, ' ')
    .trim();

const FURNITURE_RULES = [
  [/체어|의자|스툴|chair|stool|해먹|hammock|코트|cot\b|간이침대/i, 'chair'],
  [/테이블|상판|table|선반|랙|rack/i, 'table'],
];

const COOKING_RULES = [
  // 물통이 가장 먼저다. 날진 제품군은 '보틀'이라 안 적고 입구 규격(내로우/와이드 마우스)이나
  // 모델명(캔텐·시퍼)으로만 부르는 경우가 많아 그 표기까지 함께 잡는다.
  [/물통|보틀|bottle|캔틴|캔텐|canteen|드로미더리|dromedary|하이드레이션|hydration|블래더|bladder|수통|내로우\s?마우스|와이드\s?마우스|narrow\s?mouth|wide\s?mouth|시퍼|sipper|워터\s?(팩|백)|날진|nalgene|플라스크|flask/i, 'bottle'],
  [/토치|torch/i, 'torch'],
  // 버너. 모델명이 곧 버너인 라인(윈드마스터·윈드프로·윈드버너)을 함께 넣는다 —
  // 아래 쿡웨어 규칙의 '시스템'에 먼저 걸리면 안 되므로 순서가 위여야 한다.
  [/버너|스토브|스토프|burner|stove|윈드스크린|windscreen|화로|가스\s?카트리지|연료통|윈드\s?(마스터|프로|버너)|wind\s?(master|pro|burner)/i, 'stove'],
  // 컵이 쿡웨어보다 먼저다 — '시에라'(시에라컵)가 쿡웨어의 세트 규칙에 먼저 걸리면 안 된다.
  [/머그|컵|텀블러|잔|시에라|mug|cup|tumbler|sierra/i, 'cup'],
  // 코펠·쿡웨어 — 이번 개정으로 새로 만든 자리. 그 전에는 갈 곳이 없어 'cooking'에 남아 있었다.
  // 한국어 표기가 제각각이라(포트/팟/팬/코펠/쿡셋/쿠기세트) 넓게 잡는다.
  [/쿡|쿠커|쿠기|코펠|케틀|캐틀|주전자|냄비|프라이팬|팬|포트|팟|논스틱|스킬렛|그리들|보일러|콤보|시스템|트렉\s?\d|cookset|cooker|kettle|pot\b|pan\b|skillet/i, 'cookware'],
  [/그릇|보울|볼|접시|플레이트|트레이|도시락|런치박스|용기|식기|종지|bowl|plate|tray|lunch\s?box/i, 'bowl'],
  [/수저|젓가락|찹스틱|스푼|포크|나이프|커틀러|커트러|스포크|집게|스페츌라|스패출러|스패츌러|휘스크|주걱|국자|텅|탕스|오피넬|chopstick|spoon|fork|knife|cutlery|spork|tong|opinel/i, 'cutlery'],
];

const pick = (rules, label, fallback) => {
  for (const [re, key] of rules) {
    if (re.test(label)) {
      return key;
    }
  }

  return fallback;
};

/** `furniture` 문서를 체어/테이블/그 외 기타로 가른다. */
export const splitFurniture = label => pick(FURNITURE_RULES, label, 'furniture_etc');

/** `cooking` 문서를 세분 조리 카테고리로 가른다. 못 가르면 식기류 기타. */
export const splitCooking = label => pick(COOKING_RULES, label, 'cookware_etc');
