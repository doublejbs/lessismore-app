// 외부 후기 관련성 판정(공용) — 규칙의 단일 소스는 CampSite CS-3 `관련성 필터` 항목이다.
// 네이버·유튜브 검색은 부분 매칭으로 무엇이든 돌려주므로 응답을 그대로 표시하면 무관 콘텐츠가 섞인다
// (캐시 100건 실측: 유튜브 체감 무관 43.7%, 블로그 6.7%). 제목에 대상 토큰이 하나도 없는 항목은 버린다.
// 박지 상세(CS-3)와 장비 상세(GD-6)가 함께 쓴다 — 어떤 값을 필수 토큰으로 삼을지는 호출측이 정한다.

// 1자 토큰은 아무 제목에나 걸려 필터가 무력해지므로 판정에서 뺀다.
const MIN_TOKEN_LENGTH = 2;

// 사이즈·성별처럼 여러 장비에 공통으로 붙는 토큰. 이것만 맞아도 통과시키면
// 제품이 다른 결과가 그대로 올라온다 — 필수 토큰에서 제외한다(GD-6).
// **검색어(buildSearchPhrase)와 필수 토큰 판정이 공통으로 제외하는 집합**이다 —
// 검색어에 사이즈·성별이 붙으면 검색이 과하게 좁아져 후보 자체가 사라진다.
// 정규화를 거친 형태로 담아 두고 정규화된 토큰과 비교한다.
// 1자 항목(`s`·`남` 등)은 위 길이 규칙이 이미 걸러내지만, 규칙이 바뀌어도 남도록 함께 적어 둔다.
const SIZE_AND_GENDER_TOKENS = new Set([
  'mens',
  'womens',
  '남', // l10n-ignore
  '여', // l10n-ignore
  '공용', // l10n-ignore
  's',
  'm',
  'l',
  'xl',
  '스몰', // l10n-ignore
  '미디움', // l10n-ignore
  '미디엄', // l10n-ignore
  '라지', // l10n-ignore
  '엑스라지', // l10n-ignore
  '투엑스라지', // l10n-ignore
  '단품', // l10n-ignore
  '세트', // l10n-ignore
]);

// 카테고리·품목 명사. **필수 토큰 판정에서만 추가로 제외하고 검색어에는 그대로 남긴다** —
// 검색어에서 빼면 `엑스패드 렘`처럼 품목이 사라진 문구가 되어 아무것도 찾지 못한다(회귀).
// 판정에서 빼는 이유: 카테고리 명사만으로 판정하면 같은 품목의 **다른 제품**이 통과한다
// (라이브 실측: `엑스패드 렘 필로우` 상세의 필수 토큰이 `["필로우"]`뿐이라
// `엑스패드 딥슬립 필로우`·`랩 스트라토스피어 필로우`(타사)가 통과했다).
// 모델명이 함께 있는 장비(`스텔라릿지 텐트`)는 모델명 토큰이 판정을 계속 담당한다(GD-6).
const CATEGORY_TOKENS = new Set([
  '필로우', // l10n-ignore
  'pillow',
  '텐트', // l10n-ignore
  'tent',
  '배낭', // l10n-ignore
  '백팩', // l10n-ignore
  'backpack',
  '침낭', // l10n-ignore
  '매트', // l10n-ignore
  'mat',
  'pad',
  '파우치', // l10n-ignore
  'pouch',
  '체어', // l10n-ignore
  'chair',
  '스토브', // l10n-ignore
  'stove',
  '재킷', // l10n-ignore
  '자켓', // l10n-ignore
  'jacket',
  '팬츠', // l10n-ignore
  'pants',
  '후디', // l10n-ignore
  'hoody',
  '셔츠', // l10n-ignore
  'shirt',
  '티셔츠', // l10n-ignore
  '베스트', // l10n-ignore
  'vest',
  '슈즈', // l10n-ignore
  'shoes',
  '파카', // l10n-ignore
  'parka',
  '장갑', // l10n-ignore
  'gloves',
]);

// 표기 차이로 같은 대상이 탈락하는 것을 막기 위해 양쪽을 같은 형태로 만든다
// (`AMG-TITANIUM`/`amg titanium`, `X.Mid`/`xmid`, `헬리녹스·체어원`).
// 아포스트로피(ASCII `'`·타이포그래픽 `’`)까지 지우는 이유: 카탈로그의 `men's`·`women's`가
// 일반 토큰 `mens`·`womens`와 같은 형태가 되어야 한다. 남겨 두면 성별 표기가 필수 토큰으로
// 새어 나가 아무 제목에나 걸리고 필터가 무력해진다(카탈로그 실측 `men's` 7.6%·`women's` 6.7%).
const normalizeToken = (value: string): string => {
  return value.toLowerCase().replace(/[\s\-_·.'’]/g, '');
};

// 호출측 타입은 string이지만 Firestore 문서를 캐스팅으로 받는 경로가 있어 문자열이 아닌 값이 실제로 온다
// (카탈로그 `gear/qsJalQ0oL4KtS1H6Klcm`의 `name`·`nameKorean`이 숫자 `2.5`). `!source` 가드만 두면
// 숫자가 통과해 `source.split`에서 TypeError가 나고, 호출측 try/catch에 삼켜져 후기 섹션이
// 조용히 사라진다(재시도도 없다). 문자열로 변환해 살리지 않고 건너뛴다 — 모델명이 `2.5`뿐인
// 장비는 어차피 판정 근거가 못 된다. `unknown`을 받는 타입 가드로 두는 이유: 시그니처가 string이면
// 런타임에 비문자열이 온다는 계약이 코드에 드러나지 않고, 호출측 좁히기도 동작하지 않는다.
const isUsableSource = (source: unknown): source is string => {
  return typeof source === 'string' && Boolean(source);
};

// 이름 하나에서 낱말 토큰을 뽑는다. 낱말 단위로 쪼개는 이유는 제목이 이름 전체를 그대로
// 적지 않기 때문이다(`제로그램 엘찰텐 2.5p` → `엘찰텐`).
const buildWordTokens = (source: string): string[] => {
  const tokens: string[] = [];

  for (const word of source.split(/\s+/)) {
    const token = normalizeToken(word);

    if (token.length < MIN_TOKEN_LENGTH) {
      continue;
    }

    if (SIZE_AND_GENDER_TOKENS.has(token) || CATEGORY_TOKENS.has(token)) {
      continue;
    }

    tokens.push(token);
  }

  return tokens;
};

// 이름 하나를 낱말로 쪼개지 않고 공백까지 제거한 한 토큰으로 만든다(`렘 필로우` → `렘필로우`).
// 사이즈·성별 낱말은 여기서도 뺀다 — 제목에는 사이즈가 안 적히므로 남겨 두면 이어 붙인 토큰이
// 제목과 어긋나 전량 탈락한다(라이브 실측 `콕 파우치 - S` → `콕파우치s`는 `콕 파우치 후기`에 안 걸린다).
// 카테고리 명사는 반대로 남긴다 — 빼면 `콕`처럼 1자만 남아 고유성이 사라진다.
// 길이 규칙에 걸리는 값은 판정 근거가 못 되므로 빈 문자열로 돌려준다.
const buildWholeNameToken = (source: string): string => {
  const token = source
    .split(/\s+/)
    .filter(word => !SIZE_AND_GENDER_TOKENS.has(normalizeToken(word)))
    .map(word => normalizeToken(word))
    .join('');

  if (token.length < MIN_TOKEN_LENGTH) {
    return '';
  }

  return token;
};

// 제품명·박지명처럼 여러 낱말로 이뤄진 값에서 필수 토큰(낱말 토큰)을 뽑는다.
// 박지(CS-3)는 이름이 하나뿐이라 폴백 없이 이 규칙만 쓴다.
export const buildRequiredTokens = (sources: string[]): string[] => {
  const tokens = new Set<string>();

  for (const source of sources) {
    if (!isUsableSource(source)) {
      continue;
    }

    for (const token of buildWordTokens(source)) {
      tokens.add(token);
    }
  }

  return Array.from(tokens);
};

// 장비 필수 토큰(GD-6) — 표시명·캐논컬명처럼 같은 대상의 여러 표기를 받아 **이름별로** 판단한다:
// 낱말 토큰을 하나도 못 내는 이름은 그 이름의 전체 토큰으로 대신 채우고, 결과를 합집합으로 모은다.
// 전체 토큰이 필요한 이유는 `렘`처럼 1자 고유 모델명이 길이 규칙에 걸려 버려지고 나머지가
// 카테고리 명사뿐이기 때문이다 — 이어 붙이면 고유성이 되살아난다(`["필로우"]` → `["렘필로우"]`로
// 블로그 통과 20건(대부분 타사)이 3건 전부 해당 제품으로 바뀌었다).
// **이름별로 판단하는 이유**: 합집합이 빌 때만 폴백하면 한글 표시명이 토큰을 못 내도 영문
// 캐논컬명의 로마자 토큰이 남아 폴백을 건너뛴다. 한국어 제목은 그 토큰에 걸리지 않아 후보가
// 전량 탈락하고 후기 섹션이 사라진다(라이브 카탈로그 11건: `돔 3 텐트 매트`/`Dome 3 Tent Mat`).
export const buildNameRequiredTokens = (names: string[]): string[] => {
  const tokens = new Set<string>();

  for (const name of names) {
    if (!isUsableSource(name)) {
      continue;
    }

    const wordTokens = buildWordTokens(name);

    if (wordTokens.length > 0) {
      for (const token of wordTokens) {
        tokens.add(token);
      }

      continue;
    }

    const wholeNameToken = buildWholeNameToken(name);

    if (!wholeNameToken) {
      continue;
    }

    tokens.add(wholeNameToken);
  }

  return Array.from(tokens);
};

// 필수 토큰 마지막 폴백(GD-6): 브랜드는 낱말로 쪼개지 않고 문자열 전체를 한 토큰으로 쓴다 —
// 쪼개면 `노스` 같은 조각이 무관한 제목에 걸린다. 브랜드를 마지막에 두는 이유는 `브랜드만 일치`
// 문제(`몽벨 버사자켓` 상세에 `몽벨 아울렛 득템후기`)를 되살리기 때문이다.
export const buildBrandTokens = (sources: string[]): string[] => {
  const tokens = new Set<string>();

  for (const source of sources) {
    if (!isUsableSource(source)) {
      continue;
    }

    const token = normalizeToken(source);

    if (token.length < MIN_TOKEN_LENGTH) {
      continue;
    }

    tokens.add(token);
  }

  return Array.from(tokens);
};

// 항목 제목에 필수 토큰이 하나라도 들어 있는지 본다. 요약·설명은 보지 않는다 —
// 실제 후기는 제목에 대상을 적고, 설명까지 보면 `식용유 1티스푼` 같은 계량 표현에 걸려
// 무관 영상이 통과한다(CS-3).
export const matchesRequiredTokens = (
  title: string,
  requiredTokens: string[]
): boolean => {
  // 필수 토큰이 없으면 판정 근거가 없다 — 필터를 걸면 전량 탈락하므로 통과시킨다.
  if (requiredTokens.length === 0) {
    return true;
  }

  const normalizedTitle = normalizeToken(title);

  // 토큰에 정규화를 한 번 더 거는 이유: normalizeToken은 멱등이라 이미 정규화된 값이면 비용·결과가 같고,
  // 호출측이 정규화되지 않은 값을 넘겨도 판정이 어긋나지 않는다(암묵적 사전조건 제거).
  return requiredTokens.some(token =>
    normalizedTitle.includes(normalizeToken(token))
  );
};

// 검색어에 넣을 이름을 만든다 — 사이즈·성별이 붙으면 검색이 과하게 좁아져 후보 자체가 사라진다
// (라이브 실측: `몽벨 montbell 버사자켓 남 미디엄`은 유튜브 0건, 사이즈·성별을 뺀 검색어는 25건).
// 낱말을 버릴지 판정할 때만 정규화를 쓰고 출력은 원문 낱말·순서를 그대로 둔다 — 검색어는 사람이
// 읽는 문구여야 하고 정규화한 형태(`몽벨버사자켓`)로는 검색이 되지 않는다.
// 길이 규칙(MIN_TOKEN_LENGTH)은 적용하지 않는다 — 모델 번호처럼 1자인 낱말(`에어로라이트 2`의 `2`)이
// 빠지면 `2`와 `3`이 구분되지 않아 다른 모델의 후기가 섞인다. 길이 규칙은 필수 토큰 판정 전용이다(GD-6).
export const buildSearchPhrase = (name: string): string => {
  // 카탈로그에 `name`이 숫자인 문서가 실제로 있어(위 isUsableSource 주석) 문자열 여부까지 본다.
  if (!isUsableSource(name)) {
    return '';
  }

  // 카테고리 명사(CATEGORY_TOKENS)는 빼지 않는다 — 검색어에서 `필로우`·`텐트`가 사라지면
  // `엑스패드 렘`처럼 품목 없는 문구가 되어 후보를 못 찾는다. 판정 전용 집합과 구분한다.
  const words = name
    .split(/\s+/)
    .filter(
      word => Boolean(word) && !SIZE_AND_GENDER_TOKENS.has(normalizeToken(word))
    );

  // 낱말이 전부 사이즈·성별 토큰이면 검색어에 제조사만 남아 아무 결과도 찾지 못한다 — 원문을 그대로 쓴다.
  if (words.length === 0) {
    return name;
  }

  return words.join(' ');
};
